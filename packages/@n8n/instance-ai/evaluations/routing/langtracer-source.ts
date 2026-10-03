// ---------------------------------------------------------------------------
// Pulls routing cases from a LangTracer suite (`--source langtracer`).
// ---------------------------------------------------------------------------

import { routingCasesFromExport } from './langtracer-cases';
import { resolveRoutingLangTracerConfig } from './langtracer-config';
import {
	isRoutingCaseSelected,
	toDiscoveryScenario,
	type LoadedRoutingCase,
	type RoutingCaseSelection,
} from './loader';
import { findLangTracerSuite, LangTracerClient } from '../langtracer/client';

export interface LangTracerRoutingSuite {
	suite: { id: number; slug: string };
	cases: LoadedRoutingCase[];
}

/**
 * Exports the suite and rebuilds every case from its tags. Any case that does
 * not rebuild fails the whole load with every fault named, like the disk loader.
 */
export async function loadRoutingCasesFromLangTracer(
	suiteRef: string,
	selection: RoutingCaseSelection = {},
	client: LangTracerClient = new LangTracerClient(resolveRoutingLangTracerConfig()),
): Promise<LangTracerRoutingSuite> {
	const suites = await client.listSuites();
	const suite = findLangTracerSuite(suites, suiteRef);
	if (!suite) {
		const known = suites
			.map((s) => s.slug)
			.sort()
			.join(', ');
		throw new Error(`LangTracer suite "${suiteRef}" not found. Available: ${known || '(none)'}.`);
	}

	const exported = await client.exportSuite(suite.id);
	const selected = Object.fromEntries(
		Object.entries(exported.files).filter(([fileName]) =>
			isRoutingCaseSelected(fileName.replace(/\.json$/i, ''), selection),
		),
	);
	const { cases, errors } = routingCasesFromExport(selected);
	if (errors.length > 0) {
		throw new Error(
			`Invalid routing case(s) in LangTracer suite "${suite.slug}":\n${errors.map((e) => `  - ${e}`).join('\n')}`,
		);
	}
	return {
		suite: { id: suite.id, slug: suite.slug },
		cases: cases.map((routingCase) => ({
			routingCase,
			scenario: toDiscoveryScenario(routingCase),
		})),
	};
}
