workflow({ name: 'F45: SAP Connection' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			name: 'When clicking \u2018Execute workflow\u2019',
			params: {},
			version: 1,
		},
		(items) => {
			const set_Login_Data = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Set Login Data',
					params: {
						options: {},
						assignments: {
							assignments: [
								{
									id: '0d7bca14-f15c-4722-b10a-5c10fb763247',
									name: 'sap_url',
									type: 'string',
									value: '',
								},
								{
									id: '8edfe1d1-bbbe-487b-bc5d-591ed9faa97d',
									name: 'sap_username',
									type: 'string',
									value: '',
								},
								{
									id: '6ff2fb60-0c71-4fab-ae31-26bfcba03058',
									name: 'sap_password',
									type: 'string',
									value: '',
								},
								{
									id: '838523c8-1ebb-4bd1-a13b-3f0921f97576',
									name: 'sap_companydb',
									type: 'string',
									value: '',
								},
							],
						},
					},
					version: 3.4,
				}),
			);
			try {
				const sAP_Connection = executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'SAP Connection',
					params: {
						url: `${set_Login_Data.json.sap_url}Login`,
						method: 'POST',
						options: { allowUnauthorizedCerts: true },
						jsonBody: `{
       "UserName": "${set_Login_Data.json.sap_username}",
       "Password": "${set_Login_Data.json.sap_password}",
       "CompanyDB": "${set_Login_Data.json.sap_companydb}"
}`,
						sendBody: true,
						specifyBody: 'json',
					},
					version: 4.2,
				});
			} catch (e) {
				const failed = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Failed',
					params: {
						options: {},
						assignments: {
							assignments: [
								{
									id: '7ed3ddd5-5334-4a53-8f2d-1c883129b6c3',
									name: 'statusCode',
									type: 'string',
									value: set_Login_Data.json.error.status,
								},
								{
									id: 'b5600ed6-ef4b-4b4a-9829-2afc290bd0b3',
									name: 'errorMessage',
									type: 'string',
									value: set_Login_Data.json.error.message,
								},
							],
						},
					},
					version: 3.4,
				});
			}
			const success = sAP_Connection.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Success',
					params: {
						options: {},
						assignments: {
							assignments: [
								{
									id: 'a0be1383-9c5e-4246-b506-7a453c1859f6',
									name: 'sessionID',
									type: 'string',
									value: item.json.SessionId,
								},
							],
						},
					},
					version: 3.4,
				}),
			);
		},
	);
});
