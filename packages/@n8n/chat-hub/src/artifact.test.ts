import type { ChatMessageContentChunk } from '@n8n/api-types';

import { collectChatArtifacts } from './artifact';

describe(collectChatArtifacts, () => {
	it('should create a single artifact', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					type: 'md',
					content: '# Hello World',
				},
				isIncomplete: false,
			},
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'My Document',
				type: 'md',
				content: '# Hello World',
			},
		]);
	});

	it('should create multiple artifacts', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'Document 1',
					type: 'md',
					content: 'Content 1',
				},
				isIncomplete: false,
			},
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'Document 2',
					type: 'html',
					content: '<h1>Content 2</h1>',
				},
				isIncomplete: false,
			},
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'Document 1',
				type: 'md',
				content: 'Content 1',
			},
			{
				title: 'Document 2',
				type: 'html',
				content: '<h1>Content 2</h1>',
			},
		]);
	});

	it('should skip artifact-create without title', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: '',
					type: 'md',
					content: 'Content',
				},
				isIncomplete: false,
			},
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'Valid Document',
					type: 'md',
					content: 'Valid Content',
				},
				isIncomplete: false,
			},
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'Valid Document',
				type: 'md',
				content: 'Valid Content',
			},
		]);
	});

	it('should edit an artifact (single occurrence)', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					type: 'md',
					content: 'Hello world, hello universe',
				},
				isIncomplete: false,
			},
			{
				type: 'artifact-edit',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					oldString: 'hello',
					newString: 'goodbye',
					replaceAll: false,
				},
				isIncomplete: false,
			},
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'My Document',
				type: 'md',
				content: 'Hello world, goodbye universe',
			},
		]);
	});

	it('should edit an artifact (replaceAll)', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					type: 'md',
					content: 'hello world, hello universe',
				},
				isIncomplete: false,
			},
			{
				type: 'artifact-edit',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					oldString: 'hello',
					newString: 'goodbye',
					replaceAll: true,
				},
				isIncomplete: false,
			},
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'My Document',
				type: 'md',
				content: 'goodbye world, goodbye universe',
			},
		]);
	});

	it('should handle multiple edits to the same artifact', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					type: 'md',
					content: 'Step 1',
				},
				isIncomplete: false,
			},
			{
				type: 'artifact-edit',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					oldString: 'Step 1',
					newString: 'Step 2',
					replaceAll: false,
				},
				isIncomplete: false,
			},
			{
				type: 'artifact-edit',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					oldString: 'Step 2',
					newString: 'Step 3',
					replaceAll: false,
				},
				isIncomplete: false,
			},
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'My Document',
				type: 'md',
				content: 'Step 3',
			},
		]);
	});

	it('should ignore artifact-edit when target artifact does not exist', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'Document A',
					type: 'md',
					content: 'Content A',
				},
				isIncomplete: false,
			},
			{
				type: 'artifact-edit',
				content: '<command>...</command>',
				command: {
					title: 'Document B',
					oldString: 'old',
					newString: 'new',
					replaceAll: false,
				},
				isIncomplete: false,
			},
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'Document A',
				type: 'md',
				content: 'Content A',
			},
		]);
	});

	it('should ignore text and hidden items', () => {
		const items: ChatMessageContentChunk[] = [
			{ type: 'text', content: 'Some text before' },
			{
				type: 'artifact-create',
				content: '<command>...</command>',
				command: {
					title: 'My Document',
					type: 'md',
					content: 'Content',
				},
				isIncomplete: false,
			},
			{ type: 'text', content: 'Some text after' },
			{ type: 'hidden', content: '<com' },
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'My Document',
				type: 'md',
				content: 'Content',
			},
		]);
	});

	it('should handle incomplete artifacts', () => {
		const items: ChatMessageContentChunk[] = [
			{
				type: 'artifact-create',
				content: '<command:artifact-create>\n<title>Test',
				command: {
					title: 'Test',
					type: 'md',
					content: 'Partial content',
				},
				isIncomplete: true,
			},
		];

		const result = collectChatArtifacts(items);
		expect(result).toEqual([
			{
				title: 'Test',
				type: 'md',
				content: 'Partial content',
			},
		]);
	});
});
