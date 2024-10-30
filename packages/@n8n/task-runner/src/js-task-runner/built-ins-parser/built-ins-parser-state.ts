import type { N8nMessage } from '../../runner-types';

/**
 * Class to keep track of which built-in variables are accessed in the code
 */
export class BuiltInsParserState {
	neededNodeNames: Set<string> = new Set();

	needsAllNodes = false;

	needs$env = false;

	needs$input = false;

	needs$execution = false;

	needs$prevNode = false;

	constructor(opts: Partial<BuiltInsParserState> = {}) {
		Object.assign(this, opts);
	}

	markNeedsAllNodes() {
		this.needsAllNodes = true;
		this.neededNodeNames = new Set();
	}

	markNodeAsNeeded(nodeName: string) {
		if (this.needsAllNodes) {
			return;
		}

		this.neededNodeNames.add(nodeName);
	}

	markEnvAsNeeded() {
		this.needs$env = true;
	}

	markInputAsNeeded() {
		this.needs$input = true;
	}

	markExecutionAsNeeded() {
		this.needs$execution = true;
	}

	markPrevNodeAsNeeded() {
		this.needs$prevNode = true;
	}

	toDataRequestParams(): N8nMessage.ToRequester.TaskDataRequest['requestParams'] {
		return {
			dataOfNodes: this.needsAllNodes ? 'all' : Array.from(this.neededNodeNames),
			env: this.needs$env,
			input: this.needs$input,
			prevNode: this.needs$prevNode,
		};
	}

	static newNeedsAllDataState() {
		const obj = new BuiltInsParserState();
		obj.markNeedsAllNodes();
		obj.markEnvAsNeeded();
		obj.markInputAsNeeded();
		obj.markExecutionAsNeeded();
		obj.markPrevNodeAsNeeded();
		return obj;
	}
}
