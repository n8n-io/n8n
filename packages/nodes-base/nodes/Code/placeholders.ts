export const ALL_ITEMS_PLACEHOLDER = `
// Loop over input items and add a new field
// called 'myNewField' to the JSON of each one
for (const item of $input.all()) {
  item.json.myNewField = 1;
}

return $input.all();
`.trim();

export const EACH_ITEM_PLACEHOLDER = `
// Add a new field called 'myNewField' to the
// JSON of the item
$input.item.json.myNewField = 1;

return $input.item;
`.trim();

export const JS_CODE_PARAM_DESCRIPTION =
	'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <code>$today</code> for dates and <code>$jmespath</code> for querying JSON structures. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.function">Learn more</a>.';
