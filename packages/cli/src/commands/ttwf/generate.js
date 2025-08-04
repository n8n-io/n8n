'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.TTWFGenerateCommand = void 0;
const decorators_1 = require('@n8n/decorators');
const zod_1 = require('zod');
const base_command_1 = require('../base-command');
const flagsSchema = zod_1.z.object({
	prompt: zod_1.z
		.string()
		.alias('p')
		.describe('Prompt to generate a workflow from. Mutually exclusive with --input.')
		.optional(),
	input: zod_1.z
		.string()
		.alias('i')
		.describe('Input dataset file name. Mutually exclusive with --prompt.')
		.optional(),
	output: zod_1.z
		.string()
		.alias('o')
		.describe('Output file name to save the results. Default is ttwf-results.jsonl')
		.default('ttwf-results.jsonl'),
	limit: zod_1.z
		.number()
		.int()
		.alias('l')
		.describe('Number of items from the dataset to process. Only valid with --input.')
		.default(-1),
	concurrency: zod_1.z
		.number()
		.int()
		.alias('c')
		.describe('Number of items to process in parallel. Only valid with --input.')
		.default(1),
});
let TTWFGenerateCommand = class TTWFGenerateCommand extends base_command_1.BaseCommand {
	async run() {
		this.logger.error(
			'This command is displayed until all ai-workflow builder related PR are merged',
		);
	}
	async catch(error) {
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack);
	}
};
exports.TTWFGenerateCommand = TTWFGenerateCommand;
exports.TTWFGenerateCommand = TTWFGenerateCommand = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'ttwf:generate',
			description: 'Create a workflow(s) using AI Text-to-Workflow builder',
			examples: [
				'$ n8n ttwf:generate --prompt "Create a telegram chatbot that can tell current weather in Berlin" --output result.json',
				'$ n8n ttwf:generate --input dataset.jsonl --output results.jsonl',
			],
			flagsSchema,
		}),
	],
	TTWFGenerateCommand,
);
//# sourceMappingURL=generate.js.map
