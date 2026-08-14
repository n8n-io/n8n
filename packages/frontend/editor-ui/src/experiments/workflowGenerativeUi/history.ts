export class SpecHistory {
	private specs: unknown[] = [];

	push(spec: unknown): void {
		this.specs = [...this.specs, spec].slice(-10);
	}

	current(): unknown | undefined {
		return this.specs.at(-1);
	}

	get length(): number {
		return this.specs.length;
	}

	undo(): unknown | undefined {
		if (this.specs.length > 1) this.specs.pop();
		return this.current();
	}

	reset(spec: unknown): void {
		this.specs = [spec];
	}
}

// Keyed by workflow identity, not by workflow content: editing the workflow must
// not silently replace a view the reader asked for.
export function historyKey(workflowId: string, view: 'story' | 'play'): string {
	return `n8n.workflowGenerativeUi.history.${workflowId}.${view}`;
}
