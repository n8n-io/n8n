workflow({ name: 'F40: Form to Google Doc' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.formTrigger',
			name: 'Form',
			params: {
				options: {},
				formTitle: 'Form',
				formFields: { values: [{ fieldLabel: 'name', requiredField: true }] },
			},
			version: 2.2,
		},
		(items) => {
			const copy_template_file = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.googleDrive',
					name: 'Copy template file',
					params: {
						name: item.json.name,
						fileId: {
							__rl: true,
							mode: 'list',
							value: '1KyR0UMIOpEkjwa6o1gTggNBP2A6EWwppV59Y6NQuDYw',
							cachedResultUrl:
								'https://docs.google.com/document/d/1KyR0UMIOpEkjwa6o1gTggNBP2A6EWwppV59Y6NQuDYw/edit?usp=drivesdk',
							cachedResultName: 'Szablon: Dokument testowy',
						},
						options: {},
						operation: 'copy',
					},
					credentials: {
						googleDriveOAuth2Api: { id: 'credential-id', name: 'googleDriveOAuth2Api Credential' },
					},
					version: 3,
				}),
			);
			const format_form_data = copy_template_file.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.code',
					name: 'Format form data',
					params: {
						jsCode:
							"const data = [];\n\nObject.keys($('Form').all().map((item) => {\n  Object.keys(item.json).map((bodyProperty) => {\n    data.push({\n      key: bodyProperty,\n      value: item.json[bodyProperty],\n    });\n  })\n}));\n\nreturn {\n  webhook_data: data,\n  pairedItem: 0,\n};",
					},
					version: 2,
				}),
			);
			const format_form_data_to_Google_Doc_API = format_form_data.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.code',
					name: 'Format form data to Google Doc API',
					params: {
						jsCode:
							'const result = [];\n\n$(\'Format form data\').all().map((item) => {\n  item.json.webhook_data.map((data) => {\n    if ("submittedAt" !== data.key && "formMode" !== data.key) {\n      result.push({\n        "replaceAllText": {\n            "containsText": {\n              "text": `{{${data.key}}}`, \n              "matchCase": true\n            },\n            "replaceText": `${data.value}`\n        },\n      });\n    }\n  });\n})\n\nreturn {\n  data: result,\n  pairedItem: 0,\n};',
					},
					version: 2,
				}),
			);
			const replace_data_in_Google_Doc = format_form_data_to_Google_Doc_API.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Replace data in Google Doc',
					params: {
						url: `https://docs.googleapis.com/v1/documents/${copy_template_file.json.id}:batchUpdate`,
						method: 'POST',
						options: {},
						sendBody: true,
						authentication: 'predefinedCredentialType',
						bodyParameters: { parameters: [{ name: 'requests', value: item.json.data }] },
						nodeCredentialType: 'googleDocsOAuth2Api',
					},
					credentials: {
						googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' },
					},
					version: 4.2,
				}),
			);
		},
	);
});
