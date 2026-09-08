import { parse } from 'yaml';

import { getGeneratedArtifacts } from '../generate';

type Parameter = {
	in?: string;
	name?: string;
	description?: string;
	schema?: { description?: string };
};

const pathParams = getGeneratedArtifacts().flatMap(({ outputPath, content }) => {
	const doc = parse(content) as { parameters?: Parameter[] };
	return (doc?.parameters ?? [])
		.filter((parameter) => parameter?.in === 'path')
		.map((parameter) => ({ outputPath, parameter }));
});

describe('generated path parameters', () => {
	it('finds path parameters to check', () => {
		expect(pathParams.length).toBeGreaterThan(0);
	});

	it.each(pathParams)(
		'$outputPath describes $parameter.name at the parameter level',
		({ parameter }) => {
			expect(parameter.description).toBeTruthy();
			expect(parameter.schema?.description).toBeUndefined();
		},
	);
});
