import type { BaseTextKey } from '@n8n/i18n';

const whimsicalLabels: BaseTextKey[] = [
	'instanceAi.agentPreview.building.imagining',
	'instanceAi.agentPreview.building.tinkering',
	'instanceAi.agentPreview.building.pondering',
	'instanceAi.agentPreview.building.brewing',
	'instanceAi.agentPreview.building.hatching',
	'instanceAi.agentPreview.building.concocting',
	'instanceAi.agentPreview.building.sparkling',
	'instanceAi.agentPreview.building.noodling',
	'instanceAi.agentPreview.building.percolating',
	'instanceAi.agentPreview.building.doodling',
];

/** Select a translation key for an AI activity label. */
export function generateWhimsicalLabel(): BaseTextKey {
	return (
		whimsicalLabels[Math.floor(Math.random() * whimsicalLabels.length)] ??
		'instanceAi.agentPreview.building'
	);
}
