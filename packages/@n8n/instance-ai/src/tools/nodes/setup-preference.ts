import credentialSetupability from './credential-setupability.json';

export interface SetupPreference {
	type: string;
	setupCompletionPercent: number | null;
	popularityScore: number | null;
}

export type NodeWithSetupPreference<T extends object> = T & {
	setupPreference?: SetupPreference[];
};

const setupPreferences = new Map<string, SetupPreference>();

for (const { id, setupability, popularity } of credentialSetupability) {
	setupPreferences.set(id, {
		type: id,
		setupCompletionPercent: setupability === null ? null : Math.round(setupability * 100),
		popularityScore: popularity === null ? null : Math.round(popularity * 10) / 10,
	});
}

export function addSetupPreference<T extends object>(
	node: T,
	credentialTypes: readonly string[],
): NodeWithSetupPreference<T> {
	const credentials = [...new Set(credentialTypes)]
		.map((credentialType) => setupPreferences.get(credentialType))
		.filter((preference): preference is SetupPreference => preference !== undefined)
		.sort((left, right) => left.type.localeCompare(right.type));

	return credentials.length > 0 ? { ...node, setupPreference: credentials } : node;
}
