// Mock API responses from Asana API
export const asanaApiResponse = {
	getComment: {
		data: {
			gid: '1234567890123456',
			resource_type: 'story',
			created_at: '2024-01-15T10:30:00.000Z',
			created_by: {
				gid: '1111111111111111',
				resource_type: 'user',
				name: 'John Doe',
			},
			resource_subtype: 'comment_added',
			text: 'This is a test comment',
			type: 'comment',
		},
	},

	getAllComments: {
		data: [
			{
				gid: '1234567890123456',
				resource_type: 'story',
				created_at: '2024-01-15T10:30:00.000Z',
				created_by: {
					gid: '1111111111111111',
					resource_type: 'user',
					name: 'John Doe',
				},
				resource_subtype: 'comment_added',
				text: 'This is the first comment',
				type: 'comment',
			},
			{
				gid: '1234567890123457',
				resource_type: 'story',
				created_at: '2024-01-15T11:00:00.000Z',
				created_by: {
					gid: '2222222222222222',
					resource_type: 'user',
					name: 'Jane Smith',
				},
				resource_subtype: 'comment_added',
				text: 'This is the second comment',
				type: 'comment',
			},
			{
				gid: '1234567890123458',
				resource_type: 'story',
				created_at: '2024-01-15T12:00:00.000Z',
				created_by: {
					gid: '1111111111111111',
					resource_type: 'user',
					name: 'John Doe',
				},
				resource_subtype: 'comment_added',
				text: 'This is the third comment',
				type: 'comment',
			},
		],
	},

	getAttachment: {
		data: {
			gid: '5555555555555555',
			resource_type: 'attachment',
			name: 'example-document.pdf',
			created_at: '2024-01-15T09:00:00.000Z',
			download_url: 'https://example.com/download/example-document.pdf',
			host: 'asana',
			parent: {
				gid: '9876543210987654',
				resource_type: 'task',
				name: 'Example Task',
			},
			permanent_url: 'https://app.asana.com/0/0/5555555555555555/f',
			resource_subtype: 'asana',
			size: 102400,
			view_url: 'https://app.asana.com/0/0/5555555555555555/f',
		},
	},

	getAllAttachments: {
		data: [
			{
				gid: '5555555555555555',
				resource_type: 'attachment',
				name: 'example-document.pdf',
				created_at: '2024-01-15T09:00:00.000Z',
				download_url: 'https://example.com/download/example-document.pdf',
				host: 'asana',
				parent: {
					gid: '9876543210987654',
					resource_type: 'task',
					name: 'Example Task',
				},
				permanent_url: 'https://app.asana.com/0/0/5555555555555555/f',
				resource_subtype: 'asana',
				size: 102400,
				view_url: 'https://app.asana.com/0/0/5555555555555555/f',
			},
			{
				gid: '5555555555555556',
				resource_type: 'attachment',
				name: 'screenshot.png',
				created_at: '2024-01-15T10:00:00.000Z',
				download_url: 'https://example.com/download/screenshot.png',
				host: 'asana',
				parent: {
					gid: '9876543210987654',
					resource_type: 'task',
					name: 'Example Task',
				},
				permanent_url: 'https://app.asana.com/0/0/5555555555555556/f',
				resource_subtype: 'asana',
				size: 256000,
				view_url: 'https://app.asana.com/0/0/5555555555555556/f',
			},
		],
	},
};

// Mock node responses (what n8n returns to the user)
export const asanaNodeResponse = {
	getComment: {
		json: {
			gid: '1234567890123456',
			resource_type: 'story',
			created_at: '2024-01-15T10:30:00.000Z',
			created_by: {
				gid: '1111111111111111',
				resource_type: 'user',
				name: 'John Doe',
			},
			resource_subtype: 'comment_added',
			text: 'This is a test comment',
			type: 'comment',
		},
	},

	getAllComments: [
		{
			json: {
				gid: '1234567890123456',
				resource_type: 'story',
				created_at: '2024-01-15T10:30:00.000Z',
				created_by: {
					gid: '1111111111111111',
					resource_type: 'user',
					name: 'John Doe',
				},
				resource_subtype: 'comment_added',
				text: 'This is the first comment',
				type: 'comment',
			},
		},
		{
			json: {
				gid: '1234567890123457',
				resource_type: 'story',
				created_at: '2024-01-15T11:00:00.000Z',
				created_by: {
					gid: '2222222222222222',
					resource_type: 'user',
					name: 'Jane Smith',
				},
				resource_subtype: 'comment_added',
				text: 'This is the second comment',
				type: 'comment',
			},
		},
		{
			json: {
				gid: '1234567890123458',
				resource_type: 'story',
				created_at: '2024-01-15T12:00:00.000Z',
				created_by: {
					gid: '1111111111111111',
					resource_type: 'user',
					name: 'John Doe',
				},
				resource_subtype: 'comment_added',
				text: 'This is the third comment',
				type: 'comment',
			},
		},
	],

	getLimitedComments: [
		{
			json: {
				gid: '1234567890123456',
				resource_type: 'story',
				created_at: '2024-01-15T10:30:00.000Z',
				created_by: {
					gid: '1111111111111111',
					resource_type: 'user',
					name: 'John Doe',
				},
				resource_subtype: 'comment_added',
				text: 'This is the first comment',
				type: 'comment',
			},
		},
		{
			json: {
				gid: '1234567890123457',
				resource_type: 'story',
				created_at: '2024-01-15T11:00:00.000Z',
				created_by: {
					gid: '2222222222222222',
					resource_type: 'user',
					name: 'Jane Smith',
				},
				resource_subtype: 'comment_added',
				text: 'This is the second comment',
				type: 'comment',
			},
		},
	],

	getAttachment: {
		json: {
			gid: '5555555555555555',
			resource_type: 'attachment',
			name: 'example-document.pdf',
			created_at: '2024-01-15T09:00:00.000Z',
			download_url: 'https://example.com/download/example-document.pdf',
			host: 'asana',
			parent: {
				gid: '9876543210987654',
				resource_type: 'task',
				name: 'Example Task',
			},
			permanent_url: 'https://app.asana.com/0/0/5555555555555555/f',
			resource_subtype: 'asana',
			size: 102400,
			view_url: 'https://app.asana.com/0/0/5555555555555555/f',
		},
	},

	getAllAttachments: [
		{
			json: {
				gid: '5555555555555555',
				resource_type: 'attachment',
				name: 'example-document.pdf',
				created_at: '2024-01-15T09:00:00.000Z',
				download_url: 'https://example.com/download/example-document.pdf',
				host: 'asana',
				parent: {
					gid: '9876543210987654',
					resource_type: 'task',
					name: 'Example Task',
				},
				permanent_url: 'https://app.asana.com/0/0/5555555555555555/f',
				resource_subtype: 'asana',
				size: 102400,
				view_url: 'https://app.asana.com/0/0/5555555555555555/f',
			},
		},
		{
			json: {
				gid: '5555555555555556',
				resource_type: 'attachment',
				name: 'screenshot.png',
				created_at: '2024-01-15T10:00:00.000Z',
				download_url: 'https://example.com/download/screenshot.png',
				host: 'asana',
				parent: {
					gid: '9876543210987654',
					resource_type: 'task',
					name: 'Example Task',
				},
				permanent_url: 'https://app.asana.com/0/0/5555555555555556/f',
				resource_subtype: 'asana',
				size: 256000,
				view_url: 'https://app.asana.com/0/0/5555555555555556/f',
			},
		},
	],

	getLimitedAttachments: [
		{
			json: {
				gid: '5555555555555555',
				resource_type: 'attachment',
				name: 'example-document.pdf',
				created_at: '2024-01-15T09:00:00.000Z',
				download_url: 'https://example.com/download/example-document.pdf',
				host: 'asana',
				parent: {
					gid: '9876543210987654',
					resource_type: 'task',
					name: 'Example Task',
				},
				permanent_url: 'https://app.asana.com/0/0/5555555555555555/f',
				resource_subtype: 'asana',
				size: 102400,
				view_url: 'https://app.asana.com/0/0/5555555555555555/f',
			},
		},
	],
};
