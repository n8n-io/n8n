import { parse } from '@vue/compiler-sfc';
import { readFileSync } from 'fs';

const content = readFileSync('src/App.vue', 'utf8');
console.log('File length:', content.length);
console.log('Has <script>:', content.includes('<script'));
console.log('Has <template>:', content.includes('<template'));
console.log('First 200 chars:', JSON.stringify(content.substring(0, 200)));

try {
	const result = parse(content, { filename: 'App.vue' });
	console.log('Parse successful:', !!result.descriptor);
	if (result.descriptor) {
		console.log('Script block found:', !!result.descriptor.script);
		console.log('Script setup block found:', !!result.descriptor.scriptSetup);
		console.log('Template block found:', !!result.descriptor.template);
		console.log('Style blocks found:', result.descriptor.styles.length);

		if (!result.descriptor.script && !result.descriptor.scriptSetup) {
			console.log('ERROR: No script blocks found!');
		}
	}
} catch (err) {
	console.log('Parse error:', err.message);
	console.log('Error details:', err);
}
