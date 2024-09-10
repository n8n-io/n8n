import { fireEvent, waitFor } from '@testing-library/vue';
import {
	createFetchResponse,
	createGetLatestMessagesResponse,
	createSendMessageResponse,
	getChatInputSendButton,
	getChatInputTextarea,
	getChatMessage,
	getChatMessageByText,
	getChatMessages,
	getChatMessageTyping,
	getChatWindowToggle,
	getChatWindowWrapper,
	getChatWrapper,
	getGetStartedButton,
	getMountingTarget,
} from '@n8n/chat/__tests__/utils';
import { createChat } from '@n8n/chat/index';

describe('createChat()', () => {
	let app: ReturnType<typeof createChat>;

	afterEach(() => {
		vi.clearAllMocks();

		app.unmount();
	});

	describe('mode', () => {
		it('should create fullscreen chat app with default options', () => {
			const fetchSpy = vi.spyOn(window, 'fetch');
			fetchSpy.mockImplementationOnce(createFetchResponse(createGetLatestMessagesResponse()));

			app = createChat({
				mode: 'fullscreen',
			});

			expect(getMountingTarget()).toBeVisible();
			expect(getChatWrapper()).toBeVisible();
			expect(getChatWindowWrapper()).not.toBeInTheDocument();
		});

		it('should create window chat app with default options', () => {
			const fetchSpy = vi.spyOn(window, 'fetch');
			fetchSpy.mockImplementationOnce(createFetchResponse(createGetLatestMessagesResponse()));

			app = createChat({
				mode: 'window',
			});

			expect(getMountingTarget()).toBeDefined();
			expect(getChatWindowWrapper()).toBeVisible();
			expect(getChatWrapper()).not.toBeVisible();
		});

		it('should open window chat app using toggle button', async () => {
			const fetchSpy = vi.spyOn(window, 'fetch');
			fetchSpy.mockImplementationOnce(createFetchResponse(createGetLatestMessagesResponse()));

			app = createChat();

			expect(getMountingTarget()).toBeVisible();
			expect(getChatWindowWrapper()).toBeVisible();

			const trigger = getChatWindowToggle();
			await fireEvent.click(trigger as HTMLElement);

			expect(getChatWrapper()).toBeVisible();
		});
	});

	describe('loadPreviousMessages', () => {
		it('should load previous messages on mount', async () => {
			const fetchSpy = vi.spyOn(global, 'fetch');
			fetchSpy.mockImplementation(createFetchResponse(createGetLatestMessagesResponse()));

			app = createChat({
				mode: 'fullscreen',
				showWelcomeScreen: true,
			});

			const getStartedButton = getGetStartedButton();
			await fireEvent.click(getStartedButton as HTMLElement);

			expect(fetchSpy.mock.calls[0][1]).toEqual(
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: expect.stringContaining('"action":"loadPreviousSession"') as unknown,
					mode: 'cors',
					cache: 'no-cache',
				}),
			);
		});
	});

	describe('initialMessages', () => {
		it.each(['fullscreen', 'window'] as Array<'fullscreen' | 'window'>)(
			'should show initial default messages in %s mode',
			async (mode) => {
				const fetchSpy = vi.spyOn(window, 'fetch');
				fetchSpy.mockImplementationOnce(createFetchResponse(createGetLatestMessagesResponse()));

				const initialMessages = ['Hello tester!', 'How are you?'];
				app = createChat({
					mode,
					initialMessages,
				});

				if (mode === 'window') {
					const trigger = getChatWindowToggle();
					await fireEvent.click(trigger as HTMLElement);
				}

				expect(getChatMessages().length).toBe(initialMessages.length);
				expect(getChatMessageByText(initialMessages[0])).toBeInTheDocument();
				expect(getChatMessageByText(initialMessages[1])).toBeInTheDocument();
			},
		);
	});

	describe('sendMessage', () => {
		it.each(['window', 'fullscreen'] as Array<'fullscreen' | 'window'>)(
			'should send a message and render a text message in %s mode',
			async (mode) => {
				const input = 'Hello User World!';
				const output = 'Hello Bot World!';

				const fetchSpy = vi.spyOn(window, 'fetch');
				fetchSpy
					.mockImplementationOnce(createFetchResponse(createGetLatestMessagesResponse))
					.mockImplementationOnce(createFetchResponse(createSendMessageResponse(output)));

				app = createChat({
					mode,
				});

				if (mode === 'window') {
					const trigger = getChatWindowToggle();
					await fireEvent.click(trigger as HTMLElement);
				}

				expect(getChatMessageTyping()).not.toBeInTheDocument();
				expect(getChatMessages().length).toBe(2);

				await waitFor(() => expect(getChatInputTextarea()).toBeInTheDocument());

				const textarea = getChatInputTextarea();
				const sendButton = getChatInputSendButton();
				await fireEvent.update(textarea as HTMLElement, input);
				expect(sendButton).not.toBeDisabled();
				await fireEvent.click(sendButton as HTMLElement);

				expect(fetchSpy.mock.calls[1][1]).toEqual(
					expect.objectContaining({
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: expect.stringMatching(/"action":"sendMessage"/) as unknown,
						mode: 'cors',
						cache: 'no-cache',
					}),
				);
				expect(fetchSpy.mock.calls[1][1]?.body).toContain(`"${input}"`);

				expect(getChatMessages().length).toBe(3);
				expect(getChatMessageByText(input)).toBeInTheDocument();
				expect(getChatMessageTyping()).toBeVisible();

				await waitFor(() => expect(getChatMessageTyping()).not.toBeInTheDocument());
				expect(getChatMessageByText(output)).toBeInTheDocument();
			},
		);

		it.each(['fullscreen', 'window'] as Array<'fullscreen' | 'window'>)(
			'should send a message and render a code markdown message in %s mode',
			async (mode) => {
				const input = 'Teach me javascript!';
				const output = '# Code\n```js\nconsole.log("Hello World!");\n```';

				const fetchSpy = vi.spyOn(window, 'fetch');
				fetchSpy
					.mockImplementationOnce(createFetchResponse(createGetLatestMessagesResponse))
					.mockImplementationOnce(createFetchResponse(createSendMessageResponse(output)));

				app = createChat({
					mode,
				});

				if (mode === 'window') {
					const trigger = getChatWindowToggle();
					await fireEvent.click(trigger as HTMLElement);
				}

				await waitFor(() => expect(getChatInputTextarea()).toBeInTheDocument());

				const textarea = getChatInputTextarea();
				const sendButton = getChatInputSendButton();
				await fireEvent.update(textarea as HTMLElement, input);
				await fireEvent.click(sendButton as HTMLElement);

				expect(getChatMessageByText(input)).toBeInTheDocument();
				expect(getChatMessages().length).toBe(3);

				await waitFor(() => expect(getChatMessageTyping()).not.toBeInTheDocument());

				const lastMessage = getChatMessage(-1);
				expect(lastMessage).toBeInTheDocument();

				expect(lastMessage.querySelector('h1')).toHaveTextContent('Code');
				expect(lastMessage.querySelector('code')).toHaveTextContent('console.log("Hello World!");');
			},
		);
	});
});
