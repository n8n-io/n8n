workflow({ name: 'F37: JSON String Validator' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: 'Webhook: Receive JSON String',
			params: {
				path: 'validate-json-string',
				options: {},
				httpMethod: 'POST',
				responseMode: 'responseNode',
			},
			version: 2,
		},
		(items) => {
			const code_Validate_JSON_String = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.code',
					name: 'Code: Validate JSON String',
					params: {
						jsCode:
							"// This node validates if the 'jsonString' in the webhook body is valid JSON.\n// It returns 'valid: true' or 'valid: false' along with an error message if invalid.\n\nconst results = [];\n\nfor (const item of $input.all()) {\n  try {\n    // Attempt to parse the jsonString from the webhook body\n    // Ensure 'jsonString' exists before attempting to parse\n    if (item.json.body && typeof item.json.body.jsonString === 'string') {\n      JSON.parse(item.json.body.jsonString);\n      results.push({ json: { valid: true } });\n    } else {\n      // Handle cases where jsonString is missing or not a string\n      results.push({ json: { valid: false, error: \"Input 'jsonString' is missing or not a string.\" } });\n    }\n  } catch (e) {\n    // If parsing fails, push the error message\n    results.push({ json: { valid: false, error: e.message } });\n  }\n}\n\nreturn results;",
					},
					version: 2,
				}),
			);
			const respond_to_Webhook_with_Result = code_Validate_JSON_String.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.respondToWebhook',
					name: 'Respond to Webhook with Result',
					params: { options: {}, respondWith: 'allIncomingItems' },
					version: 1.2,
				}),
			);
		},
	);
});
