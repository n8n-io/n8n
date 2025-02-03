import { BuiltInsParserState } from '../built-ins-parser-state';

describe('BuiltInsParserState', () => {
	describe('toDataRequestParams', () => {
		it('should return empty array when no properties are marked as needed', () => {
			const state = new BuiltInsParserState();

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: [],
				env: false,
				input: {
					chunk: undefined,
					include: false,
				},
				prevNode: false,
			});
		});

		it('should return all nodes and input when markNeedsAllNodes is called', () => {
			const state = new BuiltInsParserState();
			state.markNeedsAllNodes();

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: 'all',
				env: false,
				input: {
					chunk: undefined,
					include: true,
				},
				prevNode: false,
			});
		});

		it('should return specific node names when nodes are marked as needed individually', () => {
			const state = new BuiltInsParserState();
			state.markNodeAsNeeded('Node1');
			state.markNodeAsNeeded('Node2');

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: ['Node1', 'Node2'],
				env: false,
				input: {
					chunk: undefined,
					include: false,
				},
				prevNode: false,
			});
		});

		it('should ignore individual nodes when needsAllNodes is marked as true', () => {
			const state = new BuiltInsParserState();
			state.markNodeAsNeeded('Node1');
			state.markNeedsAllNodes();
			state.markNodeAsNeeded('Node2'); // should be ignored since all nodes are needed

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: 'all',
				env: false,
				input: {
					chunk: undefined,
					include: true,
				},
				prevNode: false,
			});
		});

		it('should mark env as needed when markEnvAsNeeded is called', () => {
			const state = new BuiltInsParserState();
			state.markEnvAsNeeded();

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: [],
				env: true,
				input: {
					chunk: undefined,
					include: false,
				},
				prevNode: false,
			});
		});

		it('should mark input as needed when markInputAsNeeded is called', () => {
			const state = new BuiltInsParserState();
			state.markInputAsNeeded();

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: [],
				env: false,
				input: {
					chunk: undefined,
					include: true,
				},
				prevNode: false,
			});
		});

		it('should use the given chunk', () => {
			const state = new BuiltInsParserState();
			state.markInputAsNeeded();

			expect(
				state.toDataRequestParams({
					count: 10,
					startIndex: 5,
				}),
			).toEqual({
				dataOfNodes: [],
				env: false,
				input: {
					chunk: {
						count: 10,
						startIndex: 5,
					},
					include: true,
				},
				prevNode: false,
			});
		});

		it('should mark prevNode as needed when markPrevNodeAsNeeded is called', () => {
			const state = new BuiltInsParserState();
			state.markPrevNodeAsNeeded();

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: [],
				env: false,
				input: {
					chunk: undefined,
					include: false,
				},
				prevNode: true,
			});
		});

		it('should return correct specification when multiple properties are marked as needed', () => {
			const state = new BuiltInsParserState();
			state.markNeedsAllNodes();
			state.markEnvAsNeeded();
			state.markInputAsNeeded();
			state.markPrevNodeAsNeeded();

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: 'all',
				env: true,
				input: {
					chunk: undefined,
					include: true,
				},
				prevNode: true,
			});
		});

		it('should return correct specification when all properties are marked as needed', () => {
			const state = BuiltInsParserState.newNeedsAllDataState();

			expect(state.toDataRequestParams()).toEqual({
				dataOfNodes: 'all',
				env: true,
				input: {
					chunk: undefined,
					include: true,
				},
				prevNode: true,
			});
		});
	});
});
