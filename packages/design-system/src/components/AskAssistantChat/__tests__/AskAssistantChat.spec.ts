import { render } from '@testing-library/vue';
import AskAssistantChat from '../AskAssistantChat.vue';

describe('AskAssistantChat', () => {
	it('renders default placeholder chat correctly', () => {
		const { container } = render(AskAssistantChat, {
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders chat with messages correctly', () => {
		const { container } = render(AskAssistantChat, {
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				messages: [
					{
						id: '1',
						type: 'text',
						role: 'assistant',
						content:
							'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
						read: false,
					},
					{
						id: '1',
						type: 'code-diff',
						role: 'assistant',
						description: 'Short solution description here that can spill over to two lines',
						codeDiff:
							'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
						suggestionId: 'test',
						quickReplies: [
							{
								type: 'new-suggestion',
								text: 'Give me another solution',
							},
							{
								type: 'resolved',
								text: 'All good',
							},
						],
						read: false,
					},
					{
						id: '2',
						type: 'text',
						role: 'user',
						content: 'Give it to me **ignore this markdown**',
						read: false,
					},
					{
						id: '2',
						type: 'block',
						role: 'assistant',
						title: 'Credential doesn’t have correct permissions to send a message',
						content:
							'Solution steps:\n1. Lorem ipsum dolor sit amet, consectetur **adipiscing** elit. Proin id nulla placerat, tristique ex at, euismod dui.\n2. Copy this into somewhere\n3. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.\n4. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui. \n Testing more code \n - Unordered item 1 \n - Unordered item 2',
						read: false,
					},
					{
						id: '2',
						type: 'code-diff',
						role: 'assistant',
						description: 'Short solution with min height',
						codeDiff:
							'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\n+The door of all subtleties!',
						quickReplies: [
							{
								type: 'new-suggestion',
								text: 'Give me another solution',
							},
							{
								type: 'resolved',
								text: 'All good',
							},
						],
						suggestionId: 'test',
						read: false,
					},
				],
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders streaming chat correctly', () => {
		const { container } = render(AskAssistantChat, {
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				messages: [
					{
						id: '1',
						type: 'text',
						role: 'assistant',
						content:
							'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
						read: false,
					},
				],
				isStreaming: true,
			},
		});
		expect(container).toMatchSnapshot();
	});
	it('renders end of session chat correctly', () => {
		const { container } = render(AskAssistantChat, {
			props: {
				user: { firstName: 'Kobi', lastName: 'Dog' },
				messages: [
					{
						id: '1',
						type: 'text',
						role: 'assistant',
						content:
							'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
						read: false,
					},
					{
						id: '123',
						role: 'assistant',
						type: 'event',
						eventName: 'end-session',
						read: false,
					},
				],
			},
		});
		expect(container).toMatchSnapshot();
	});
});
