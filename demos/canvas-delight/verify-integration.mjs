import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc';

const directory =
	'../../packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/render-types';
for (const name of ['CanvasNodeDefault.vue', 'CanvasNodeStickyNote.vue']) {
	const filename = resolve(directory, name);
	const source = readFileSync(filename, 'utf8');
	const { descriptor, errors } = parse(source, { filename });
	if (errors.length) throw new Error(JSON.stringify(errors));
	const script = compileScript(descriptor, { id: name });
	const template = compileTemplate({
		source: descriptor.template.content,
		filename,
		id: name,
		compilerOptions: { bindingMetadata: script.bindings },
	});
	if (template.errors.length) throw new Error(JSON.stringify(template.errors));
	for (const match of source.matchAll(/from '(\.\.[^']+\.vue)'/g)) {
		if (!existsSync(resolve(dirname(filename), match[1])))
			throw new Error(`Missing component: ${match[1]}`);
	}
	console.log(`${name}: script, template, and relative component imports pass`);
}
