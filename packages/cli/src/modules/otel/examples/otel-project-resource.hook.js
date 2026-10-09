// Example `otel.configure` external hook.
// Load it with: EXTERNAL_HOOK_FILES=/absolute/path/to/otel-project-resource.hook.js
//
// Maps the span attribute `n8n.project.id` to a `project.id` resource attribute on every
// exported span, and sends the same value as a `baggage` header on outbound HTTP requests.

const projectIdFrom = (spanAttributes) => {
	const projectId = spanAttributes['n8n.project.id'];
	return typeof projectId === 'string' ? { 'project.id': projectId } : {};
};

module.exports = {
	otel: {
		configure: [
			async (api) => {
				api.registerResourceAttributeMapper((spanAttributes) => projectIdFrom(spanAttributes));
				api.registerOutboundBaggageMapper(({ spanAttributes }) => projectIdFrom(spanAttributes));
			},
		],
	},
};
