workflow({ name: 'Clean My Mail' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.scheduleTrigger',
			name: 'Run Every 3 Days (Trigger)',
			params: { rule: { interval: [{ daysInterval: 3 }] } },
			version: 1.2,
		},
		(items) => {},
	);
	const fetch_SPAM_Emails = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.gmail',
			name: 'Fetch SPAM Emails',
			params: { filters: { labelIds: ['SPAM'] }, operation: 'getAll', returnAll: true },
			credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
			version: 2.1,
		}),
	);
	const fetch_Social_Emails = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.gmail',
			name: 'Fetch Social Emails',
			params: { filters: { labelIds: ['CATEGORY_SOCIAL'] }, operation: 'getAll', returnAll: true },
			credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
			version: 2.1,
		}),
	);
	const fetch_Promotion_Emails = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.gmail',
			name: 'Fetch Promotion Emails',
			params: {
				filters: { labelIds: ['CATEGORY_PROMOTIONS'] },
				operation: 'getAll',
				returnAll: true,
			},
			credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
			version: 2.1,
		}),
	);
	const combine_All_Fetched_Emails = executeNode(
		{
			type: 'n8n-nodes-base.merge',
			name: 'Combine All Fetched Emails',
			params: { numberInputs: 3 },
			version: 3.1,
		},
		[fetch_SPAM_Emails, fetch_Social_Emails, fetch_Promotion_Emails],
	);
	const split_Email_IDs_One_per_item = combine_All_Fetched_Emails.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.splitOut',
			name: 'Split Email IDs (One per item)',
			params: { options: {}, fieldToSplitOut: 'id' },
			version: 1,
		}),
	);
	const delete_All_Mails = split_Email_IDs_One_per_item.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.gmail',
			name: 'Delete All Mails',
			params: { messageId: item.json.id, operation: 'delete' },
			credentials: { gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' } },
			version: 2.1,
		}),
	);
});
