/** @example [{ body: { action: "approve", postId: "post_789", moderator: "admin@cms.com" } }] */
onWebhook({ method: 'POST', path: '/moderate' }, async ({ body, respond }) => {
	switch (body.action) {
		case 'approve':
			await http.patch(
				'https://api.cms.com/posts/update',
				{ status: 'published' },
				{ auth: { type: 'bearer', credential: 'CMS API' } },
			);
			break;
		case 'reject':
			await http.delete('https://api.cms.com/posts/remove', {
				auth: { type: 'bearer', credential: 'CMS API' },
			});
			break;
		case 'escalate':
			await http.post(
				'https://api.cms.com/escalations',
				{
					postId: 'post123',
					reason: 'needs review',
				},
				{ auth: { type: 'bearer', credential: 'CMS API' } },
			);
			break;
	}
	respond({ status: 200, body: { processed: true } });
});
