/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/naming-convention -- mocks the Slack-style SDK (PascalCase components) and intentionally uses any-based factory wrappers */
// Define mocks inline inside the factory to avoid jest.mock hoisting issues
type MockFn = jest.Mock<any, any[]>;
const mockButton: MockFn = jest.fn((opts) => ({ type: 'button', ...opts }));
const mockCard: MockFn = jest.fn((opts) => ({ type: 'card', ...opts }));
const mockActions: MockFn = jest.fn((children) => ({ type: 'actions', children }));
const mockCardText: MockFn = jest.fn((content) => ({ type: 'text', content }));
const mockSection: MockFn = jest.fn((children) => ({ type: 'section', children }));
const mockDivider: MockFn = jest.fn(() => ({ type: 'divider' }));
const mockImage: MockFn = jest.fn((opts) => ({ type: 'image', ...opts }));
const mockSelect: MockFn = jest.fn((opts) => ({ type: 'select', ...opts }));
const mockSelectOption: MockFn = jest.fn((opts) => ({ type: 'select_option', ...opts }));
const mockRadioSelect: MockFn = jest.fn((opts) => ({ type: 'radio_select', ...opts }));
const mockFields: MockFn = jest.fn((children) => ({ type: 'fields', children }));
const mockField: MockFn = jest.fn((opts) => ({ type: 'field', ...opts }));

jest.mock('../esm-loader', () => {
	// These reference the hoisted variables above via closure

	const wrap =
		(fn: MockFn) =>
		(...args: any[]) =>
			fn(...args);
	const Button = wrap(mockButton);
	const Card = wrap(mockCard);
	const Actions = wrap(mockActions);
	const CardText = wrap(mockCardText);
	const Section = wrap(mockSection);
	const Divider = wrap(mockDivider);
	const Image = wrap(mockImage);
	const Select = wrap(mockSelect);
	const SelectOption = wrap(mockSelectOption);
	const RadioSelect = wrap(mockRadioSelect);
	const Fields = wrap(mockFields);
	const Field = wrap(mockField);

	return {
		loadChatSdk: jest.fn().mockResolvedValue({
			Button,
			Card,
			Actions,
			CardText,
			Section,
			Divider,
			Image,
			Select,
			SelectOption,
			RadioSelect,
			Fields,
			Field,
		}),
	};
});

import { ComponentMapper } from '../component-mapper';
import { ChatIntegrationRegistry } from '../agent-chat-integration';
import { SlackIntegration } from '../platforms/slack-integration';
import { Container } from '@n8n/di';

describe('ComponentMapper', () => {
	let mapper: ComponentMapper;

	beforeEach(() => {
		jest.clearAllMocks();
		mapper = new ComponentMapper();
	});

	describe('toCard', () => {
		const runId = 'run-123';
		const toolCallId = 'tc-456';

		it('should map buttons with correct resume ID encoding', async () => {
			const payload = {
				title: 'Approval Required',
				components: [
					{ type: 'button', label: 'Approve', style: 'primary', value: 'yes' },
					{ type: 'button', label: 'Reject', style: 'danger', value: 'no' },
				],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockButton).toHaveBeenCalledTimes(2);
			// Button values are JSON-encoded resume payloads.
			// With no resumeSchema, wrapValueForSchema falls back to { value: rawValue }
			expect(mockButton).toHaveBeenCalledWith({
				id: `resume:${runId}:${toolCallId}:0`,
				label: 'Approve',
				style: 'primary',
				value: JSON.stringify({ value: 'yes' }),
			});
			expect(mockButton).toHaveBeenCalledWith({
				id: `resume:${runId}:${toolCallId}:1`,
				label: 'Reject',
				style: 'danger',
				value: JSON.stringify({ value: 'no' }),
			});
			expect(mockActions).toHaveBeenCalledTimes(1);
			expect(mockCard).toHaveBeenCalledWith({
				title: 'Approval Required',
				children: expect.arrayContaining([expect.objectContaining({ type: 'actions' })]),
			});
		});

		it('should use a button text field as its label when label is absent', async () => {
			// Models trained on real Slack Block Kit (where buttons carry `text`)
			// often emit the caption under `text` instead of `label`. Recover it
			// rather than falling back to the generic 'Action' placeholder.
			const payload = {
				components: [
					{
						type: 'button',
						text: 'Approve & Send to Acme',
						value: 'approve_send',
						style: 'primary',
					},
				],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockButton).toHaveBeenCalledWith(
				expect.objectContaining({ label: 'Approve & Send to Acme' }),
			);
		});

		it('should prefer label over text when both are present on a button', async () => {
			const payload = {
				components: [{ type: 'button', label: 'Approve', text: 'ignored', value: 'yes' }],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockButton).toHaveBeenCalledWith(expect.objectContaining({ label: 'Approve' }));
		});

		it('should use button text as the label when label is omitted', async () => {
			const payload = {
				title: 'Approve / Reject Demo',
				components: [
					{ type: 'button' as const, text: 'Approve', style: 'primary', value: 'approve' },
					{
						type: 'button' as const,
						text: 'Reject',
						style: 'danger',
						value: 'reject',
					},
				],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockButton).toHaveBeenNthCalledWith(1, {
				id: `resume:${runId}:${toolCallId}:0`,
				label: 'Approve',
				style: 'primary',
				value: JSON.stringify({ value: 'approve' }),
			});
			expect(mockButton).toHaveBeenNthCalledWith(2, {
				id: `resume:${runId}:${toolCallId}:1`,
				label: 'Reject',
				style: 'danger',
				value: JSON.stringify({ value: 'reject' }),
			});
		});

		it('should preserve default button style and omit style when unset', async () => {
			const payload = {
				components: [
					{ type: 'button' as const, label: 'Default', style: 'default', value: 'default' },
					{ type: 'button' as const, label: 'Unset', value: 'unset' },
				],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockButton).toHaveBeenNthCalledWith(1, {
				id: `resume:${runId}:${toolCallId}:0`,
				label: 'Default',
				style: 'default',
				value: JSON.stringify({ value: 'default' }),
			});
			expect(mockButton).toHaveBeenNthCalledWith(2, {
				id: `resume:${runId}:${toolCallId}:1`,
				label: 'Unset',
				value: JSON.stringify({ value: 'unset' }),
			});
		});

		it('should map section components with text wrapped in CardText', async () => {
			const payload = {
				components: [{ type: 'section', text: 'Some section text' }],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockCardText).toHaveBeenCalledWith('Some section text');
			expect(mockSection).toHaveBeenCalledWith([
				expect.objectContaining({ type: 'text', content: 'Some section text' }),
			]);
		});

		it('should map divider components', async () => {
			const payload = {
				components: [{ type: 'divider' }],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockDivider).toHaveBeenCalledTimes(1);
			expect(mockCard).toHaveBeenCalledWith({
				title: undefined,
				children: [expect.objectContaining({ type: 'divider' })],
			});
		});

		it('should map image components using the Image builder', async () => {
			const payload = {
				components: [{ type: 'image', url: 'https://example.com/img.png', altText: 'A photo' }],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockImage).toHaveBeenCalledWith({
				url: 'https://example.com/img.png',
				alt: 'A photo',
			});
		});

		it('should map context components with plain text', async () => {
			const payload = {
				components: [{ type: 'context', text: 'Additional info' }],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockCardText).toHaveBeenCalledWith('Additional info');
		});

		it('should map context components with elements array', async () => {
			const payload = {
				components: [
					{
						type: 'context',
						elements: [
							{ type: 'text', text: 'Timezone info' },
							{ type: 'image', url: 'https://example.com/icon.png', altText: 'icon' },
						],
					},
				],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockCardText).toHaveBeenCalledWith('Timezone info');
			expect(mockImage).toHaveBeenCalledWith({ url: 'https://example.com/icon.png', alt: 'icon' });
		});

		it('should skip context components without text or elements', async () => {
			const payload = {
				components: [{ type: 'context' }],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockCardText).not.toHaveBeenCalled();
		});

		it('should map section with accessory button as Section + Actions', async () => {
			const payload = {
				components: [
					{
						type: 'section',
						text: 'Friday evening',
						button: { label: 'Choose', value: 'date_0' },
					},
				],
			};

			await mapper.toCard(payload, runId, toolCallId);

			// Section contains only text
			expect(mockSection).toHaveBeenCalledWith([
				expect.objectContaining({ type: 'text', content: 'Friday evening' }),
			]);
			// Button is in a separate Actions block
			expect(mockButton).toHaveBeenCalledWith({
				id: `resume:${runId}:${toolCallId}:0`,
				label: 'Choose',
				value: JSON.stringify({ value: 'date_0' }),
			});
			expect(mockActions).toHaveBeenCalledTimes(1);
		});

		it('should use message as title fallback', async () => {
			const payload = {
				message: 'Schedule session',
				components: [{ type: 'section', text: 'Pick a date' }],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockCard).toHaveBeenCalledWith(expect.objectContaining({ title: 'Schedule session' }));
		});

		it('should wrap button values using resume schema with approved property', async () => {
			const payload = {
				components: [{ type: 'button', label: 'Approve', value: 'true', style: 'primary' }],
			};
			const resumeSchema = {
				type: 'object',
				properties: { approved: { type: 'boolean' } },
			};

			await mapper.toCard(payload, runId, toolCallId, resumeSchema);

			expect(mockButton).toHaveBeenCalledWith(
				expect.objectContaining({ value: JSON.stringify({ approved: true }) }),
			);
		});

		it('should wrap button values with type+value schema as { type: button, value }', async () => {
			const payload = {
				components: [{ type: 'button' as const, label: 'Go', value: 'go' }],
			};
			const resumeSchema = {
				type: 'object',
				properties: {
					type: { type: 'string' },
					value: { type: 'string' },
				},
			};

			await mapper.toCard(payload, runId, toolCallId, resumeSchema);

			expect(mockButton).toHaveBeenCalledWith(
				expect.objectContaining({
					value: JSON.stringify({ type: 'button', value: 'go' }),
				}),
			);
		});

		it('should wrap button values using resume schema with values property', async () => {
			const payload = {
				components: [{ type: 'button', label: 'Choose', value: 'date_0' }],
			};
			const resumeSchema = {
				type: 'object',
				properties: { values: { type: 'object' } },
			};

			await mapper.toCard(payload, runId, toolCallId, resumeSchema);

			expect(mockButton).toHaveBeenCalledWith(
				expect.objectContaining({ value: JSON.stringify({ values: { action: 'date_0' } }) }),
			);
		});

		it('should silently drop unsupported component types', async () => {
			const payload = {
				components: [
					{ type: 'text-input', label: 'Name', id: 'name' },
					{ type: 'select-input', label: 'Priority', id: 'prio' },
					{ type: 'modal', title: 'Form' },
					{ type: 'unknown-thing' },
				],
			};

			await mapper.toCard(payload, runId, toolCallId);

			// No child-building functions should have been called
			expect(mockButton).not.toHaveBeenCalled();
			expect(mockSection).not.toHaveBeenCalled();
			expect(mockDivider).not.toHaveBeenCalled();
			expect(mockImage).not.toHaveBeenCalled();
			expect(mockCardText).not.toHaveBeenCalled();
			expect(mockActions).not.toHaveBeenCalled();

			// Card should still be created with an empty children array
			expect(mockCard).toHaveBeenCalledWith({
				title: undefined,
				children: [],
			});
		});

		it('should omit unsupported button styles', async () => {
			const payload = {
				components: [{ type: 'button', label: 'Go', style: 'secondary', value: 'go' }],
			};

			await mapper.toCard(payload, runId, toolCallId);

			expect(mockButton).toHaveBeenCalledWith(
				expect.not.objectContaining({ style: expect.any(String) }),
			);
		});

		it('should map select components into Actions', async () => {
			const payload = {
				components: [
					{
						type: 'select' as const,
						id: 'difficulty',
						label: 'Difficulty',
						placeholder: 'Choose...',
						options: [
							{ label: 'Easy', value: 'easy' },
							{ label: 'Hard', value: 'hard', description: 'For veterans' },
						],
					},
				],
			};
			await mapper.toCard(payload, runId, toolCallId);
			expect(mockSelect).toHaveBeenCalledWith(
				expect.objectContaining({
					options: expect.arrayContaining([
						expect.objectContaining({ label: 'Easy', value: 'easy' }),
						expect.objectContaining({ label: 'Hard', value: 'hard' }),
					]),
				}),
			);
			expect(mockActions).toHaveBeenCalled();
		});

		it('should map radio_select components wrapped in Actions', async () => {
			const payload = {
				components: [
					{
						type: 'radio_select' as const,
						id: 'rating',
						label: 'Rating',
						options: [
							{ label: 'Good', value: 'good' },
							{ label: 'Bad', value: 'bad' },
						],
					},
				],
			};
			await mapper.toCard(payload, runId, toolCallId);
			expect(mockRadioSelect).toHaveBeenCalledWith(
				expect.objectContaining({
					options: expect.arrayContaining([
						expect.objectContaining({ label: 'Good', value: 'good' }),
					]),
				}),
			);
			expect(mockActions).toHaveBeenCalled();
		});

		it('should preserve radio_select components for Slack cards', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new SlackIntegration());
			Container.set(ChatIntegrationRegistry, registry);

			const payload = {
				components: [
					{
						type: 'radio_select' as const,
						id: 'next-step',
						label: 'Choose the next step:',
						options: [
							{ label: 'Send approved briefing confirmation', value: 'send' },
							{ label: 'Escalate ticket', value: 'escalate' },
						],
					},
				],
			};

			await mapper.toCard(payload, runId, toolCallId, undefined, undefined, 'slack');

			expect(mockSelect).not.toHaveBeenCalled();
			expect(mockRadioSelect).toHaveBeenCalledWith(
				expect.objectContaining({
					id: `ri-sel:next-step:${runId}:${toolCallId}`,
					label: 'Choose the next step:',
					options: expect.arrayContaining([
						expect.objectContaining({
							label: 'Send approved briefing confirmation',
							value: 'send',
						}),
						expect.objectContaining({ label: 'Escalate ticket', value: 'escalate' }),
					]),
				}),
			);
			expect(mockActions).toHaveBeenCalled();
		});

		it('should map fields components', async () => {
			const payload = {
				components: [
					{
						type: 'fields' as const,
						fields: [
							{ label: 'Name', value: 'Gandalf' },
							{ label: 'Class', value: 'Wizard' },
						],
					},
				],
			};
			await mapper.toCard(payload, runId, toolCallId);
			expect(mockField).toHaveBeenCalledTimes(2);
			expect(mockFields).toHaveBeenCalled();
		});

		it('should map fields components that use items aliases', async () => {
			const payload = {
				components: [
					{
						type: 'fields' as const,
						items: [
							{ label: 'Account', value: 'Acme Corporation' },
							{ label: 'Expansion ARR', value: '~$3,750,000 (30X)' },
						],
					},
				],
			};
			await mapper.toCard(payload, runId, toolCallId);
			expect(mockField).toHaveBeenCalledTimes(2);
			expect(mockField).toHaveBeenCalledWith({
				label: 'Account',
				value: 'Acme Corporation',
			});
			expect(mockField).toHaveBeenCalledWith({
				label: 'Expansion ARR',
				value: '~$3,750,000 (30X)',
			});
			expect(mockFields).toHaveBeenCalled();
		});

		it('should skip empty fields components', async () => {
			const payload = {
				components: [
					{
						type: 'fields' as const,
					},
				],
			};
			await mapper.toCard(payload, runId, toolCallId);
			expect(mockField).not.toHaveBeenCalled();
			expect(mockFields).not.toHaveBeenCalled();
		});
	});

	describe('toCardOrMarkdown', () => {
		it('should return strings as-is', async () => {
			const result = await mapper.toCardOrMarkdown('Hello world');

			expect(result).toBe('Hello world');
			expect(mockCard).not.toHaveBeenCalled();
		});

		it('should convert structured messages with components to a Card', async () => {
			const message = {
				components: [
					{ type: 'section', text: 'Section content' },
					{ type: 'context', text: 'Context content' },
				],
			};

			await mapper.toCardOrMarkdown(message);

			expect(mockCard).toHaveBeenCalledTimes(1);
			expect(mockSection).toHaveBeenCalledWith([
				expect.objectContaining({ type: 'text', content: 'Section content' }),
			]);
			expect(mockCardText).toHaveBeenCalledWith('Context content');
		});

		it('should render dividers in toCardOrMarkdown', async () => {
			const message = {
				components: [{ type: 'section', text: 'Has text' }, { type: 'divider' }],
			};

			await mapper.toCardOrMarkdown(message);

			expect(mockDivider).toHaveBeenCalledTimes(1);
			expect(mockCard).toHaveBeenCalledWith({
				children: [
					expect.objectContaining({ type: 'section' }),
					expect.objectContaining({ type: 'divider' }),
				],
			});
		});

		it('should fall back to String() for non-string, non-structured values', async () => {
			const result = await mapper.toCardOrMarkdown(42);

			expect(result).toBe('42');
		});

		it('should fall back to String() for null', async () => {
			const result = await mapper.toCardOrMarkdown(null);

			expect(result).toBe('null');
		});

		it('should fall back to String() for objects without components', async () => {
			const result = await mapper.toCardOrMarkdown({ foo: 'bar' });

			expect(result).toBe('[object Object]');
		});
	});
});
