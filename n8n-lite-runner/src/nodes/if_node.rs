//! The If node, `n8n-nodes-base.if`, versions 2 to 2.4.
//!
//! Items that pass the conditions go to output 0 ("true"), the rest to output 1 ("false").

use async_trait::async_trait;
use serde::Deserialize;

use super::filter::{Filter, FilterValue, Settings, TypeValidation};
use super::params;
use crate::context::ExecutionContext;
use crate::item::Item;
use crate::node::{ActionNode, NodeError, NodeInstance, NodeOutput, NodeType};
use crate::workflow::NodeDefinition;

pub struct IfType;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Parameters {
    conditions: FilterValue,
    /// The "Convert types where required" switch, stored here since version 2.1.
    #[serde(default)]
    loose_type_validation: bool,
    #[serde(default)]
    options: Options,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Options {
    #[serde(default)]
    ignore_case: bool,
    #[serde(default)]
    loose_type_validation: bool,
}

impl NodeType for IfType {
    fn name(&self) -> &'static str {
        "n8n-nodes-base.if"
    }

    fn create(&self, definition: &NodeDefinition) -> Result<NodeInstance, NodeError> {
        params::check_version(definition, 2.0, 2.4)?;
        let parameters: Parameters = params::parse(definition)?;
        let filter_options = &parameters.conditions.options;
        let loose = parameters.loose_type_validation
            || parameters.options.loose_type_validation
            || filter_options.type_validation == TypeValidation::Loose;
        let settings = Settings {
            strict: !loose,
            case_sensitive: filter_options.case_sensitive && !parameters.options.ignore_case,
        };
        let filter = Filter::new(parameters.conditions, settings);
        Ok(NodeInstance::Action(Box::new(If(filter))))
    }
}

struct If(Filter);

#[async_trait]
impl ActionNode for If {
    async fn execute(
        &self,
        context: &dyn ExecutionContext,
        input: Vec<Item>,
    ) -> Result<NodeOutput, NodeError> {
        let decisions = input
            .iter()
            .enumerate()
            .map(|(index, item)| self.0.passes(context, item, index))
            .collect::<Result<Vec<_>, _>>()?;
        let (passed, failed): (Vec<_>, Vec<_>) = input
            .into_iter()
            .zip(decisions)
            .partition(|(_, pass)| *pass);
        let items = |pairs: Vec<(Item, bool)>| pairs.into_iter().map(|(item, _)| item).collect();
        Ok(vec![items(passed), items(failed)])
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use super::*;
    use crate::expression::RunData;
    use crate::testing::{TestContext, action, definition, items, output_json};

    /// Parameters in the shape that n8n 2.2 stores.
    fn parameters(combinator: &str, conditions: Value) -> Value {
        json!({
            "conditions": {
                "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict", "version": 2 },
                "conditions": conditions,
                "combinator": combinator,
            },
            "options": {},
        })
    }

    async fn run(parameters: Value, input: &[Value]) -> Result<Vec<Vec<Value>>, NodeError> {
        run_with(TestContext::default(), parameters, input).await
    }

    async fn run_with(
        context: TestContext,
        parameters: Value,
        input: &[Value],
    ) -> Result<Vec<Vec<Value>>, NodeError> {
        let node = action(IfType.create(&definition("n8n-nodes-base.if", 2.2, parameters))?);
        let output = node.execute(&context, items(input)).await?;
        Ok(output_json(&output))
    }

    #[tokio::test]
    async fn splits_items_between_true_and_false() {
        let parameters = parameters(
            "and",
            json!([{
                "id": "1", "leftValue": "={{ $json.id }}", "rightValue": 3000,
                "operator": { "type": "number", "operation": "lt" }
            }]),
        );

        let output = run(parameters, &[json!({ "id": 1 }), json!({ "id": 5000 })])
            .await
            .unwrap();

        assert_eq!(
            output,
            [vec![json!({ "id": 1 })], vec![json!({ "id": 5000 })]]
        );
    }

    #[tokio::test]
    async fn combines_conditions_with_or() {
        // A real stored condition that also reads the webhook through `$('Webhook')`.
        let parameters = parameters(
            "or",
            json!([
                {
                    "leftValue": "={{ $json.isVip }}", "rightValue": "",
                    "operator": { "type": "boolean", "operation": "true", "singleValue": true }
                },
                {
                    "leftValue": "={{ $('Webhook').item.json.body.order.items.length }}", "rightValue": 2,
                    "operator": { "type": "number", "operation": "gt" }
                }
            ]),
        );
        let context = TestContext {
            run_data: RunData::from([(
                "Webhook".to_string(),
                items(&[json!({ "body": { "order": { "items": [1, 2, 3] } } })]),
            )]),
            ..Default::default()
        };

        let output = run_with(context, parameters, &[json!({ "isVip": false })])
            .await
            .unwrap();

        assert_eq!(output, [vec![json!({ "isVip": false })], vec![]]);
    }

    #[tokio::test]
    async fn applies_the_node_options() {
        let condition = json!([{
            "leftValue": "={{ $json.name }}", "rightValue": "ADA",
            "operator": { "type": "string", "operation": "equals" }
        }]);
        let mut parameters = parameters("and", condition);
        parameters["options"] = json!({ "ignoreCase": true });

        let output = run(parameters, &[json!({ "name": "ada" })]).await.unwrap();

        assert_eq!(output[0].len(), 1);
    }

    #[tokio::test]
    async fn strict_type_validation_fails_and_loose_converts() {
        let condition = json!([{
            "leftValue": "={{ $json.count }}", "rightValue": 5,
            "operator": { "type": "number", "operation": "gt" }
        }]);
        let strict = parameters("and", condition);
        let mut loose = strict.clone();
        loose["looseTypeValidation"] = json!(true);
        let input = [json!({ "count": "6" })];

        let error = run(strict, &input).await.unwrap_err().to_string();
        assert!(error.contains("expected a number"), "{error}");
        assert_eq!(run(loose, &input).await.unwrap()[0].len(), 1);
    }

    #[test]
    fn rejects_unsupported_operators_and_versions() {
        let date = parameters(
            "and",
            json!([{ "leftValue": "", "rightValue": "", "operator": { "type": "dateTime", "operation": "before" } }]),
        );
        let error = IfType
            .create(&definition("n8n-nodes-base.if", 2.2, date))
            .err()
            .unwrap();
        assert!(error.to_string().contains("dateTime:before"), "{error}");

        let version_1 = definition("n8n-nodes-base.if", 1.0, parameters("and", json!([])));
        assert!(IfType.create(&version_1).is_err());
    }
}
