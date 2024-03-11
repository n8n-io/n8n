import { BaseOutputParser, OutputParserException } from '@langchain/core/output_parsers';

export class ItemListOutputParser extends BaseOutputParser<string[]> {
	lc_namespace = ['n8n-nodes-langchain', 'output_parsers', 'list_items'];

	private numberOfItems: number | undefined;

	private separator: string;

	constructor(options: { numberOfItems?: number; separator?: string }) {
		super();
		if (options.numberOfItems && options.numberOfItems > 0) {
			this.numberOfItems = options.numberOfItems;
		}
		this.separator = options.separator ?? '\\n';
		if (this.separator === '\\n') {
			this.separator = '\n';
		}
	}

	async parse(text: string): Promise<string[]> {
		const response = text
			.split(this.separator)
			.map((item) => item.trim())
			.filter((item) => item);

		if (this.numberOfItems && response.length < this.numberOfItems) {
			// Only error if to few items got returned, if there are to many we can autofix it
			throw new OutputParserException(
				`Wrong number of items returned. Expected ${this.numberOfItems} items but got ${response.length} items instead.`,
			);
		}

		return response.slice(0, this.numberOfItems);
	}

	getFormatInstructions(): string {
		const instructions = `Your response should be a list of ${
			this.numberOfItems ? this.numberOfItems + ' ' : ''
		}items separated by`;

		const numberOfExamples = this.numberOfItems ?? 3;

		const examples: string[] = [];
		for (let i = 1; i <= numberOfExamples; i++) {
			examples.push(`item${i}`);
		}

		return `${instructions} "${this.separator}" (for example: "${examples.join(this.separator)}")`;
	}
}
