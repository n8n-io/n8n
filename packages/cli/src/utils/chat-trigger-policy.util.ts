import type { INodeProperties, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';

const HIDDEN_DISPLAY_OPTIONS: NonNullable<INodeProperties['displayOptions']> = {
	show: {
		'@version': [999],
	},
};

type DisplayOptionsShow = NonNullable<NonNullable<INodeProperties['displayOptions']>['show']>;

type NodeDescription = INodeTypeBaseDescription | INodeTypeDescription;

export const isPublicChatTriggerDisabled = () =>
	process.env.N8N_DISABLE_PUBLIC_CHAT_TRIGGER === 'true';

const isChatTriggerDescription = (node: Pick<INodeTypeBaseDescription, 'name'>) =>
	node.name === 'chatTrigger' || node.name.endsWith('.chatTrigger');

const hideProperty = (property: INodeProperties): INodeProperties => ({
	...property,
	displayOptions: HIDDEN_DISPLAY_OPTIONS,
});

const hasPublicDisplayCondition = (property: INodeProperties, value: boolean) => {
	const show = property.displayOptions?.show as DisplayOptionsShow | undefined;

	return (
		(Array.isArray(show?.public) && show.public.includes(value)) ||
		(Array.isArray(show?.['/public']) && show['/public'].includes(value))
	);
};

const stripPublicDisplayCondition = (property: INodeProperties): INodeProperties => {
	const show = property.displayOptions?.show as DisplayOptionsShow | undefined;

	if (!show) {
		return property;
	}

	const nextShow: DisplayOptionsShow = {
		...show,
	};

	delete nextShow.public;
	delete nextShow['/public'];

	return {
		...property,
		displayOptions: {
			...(property.displayOptions ?? {}),
			show: nextShow,
		},
	};
};

export function applyPublicChatTriggerPolicy<T extends NodeDescription>(node: T): T {
	if (
		!isPublicChatTriggerDisabled() ||
		!isChatTriggerDescription(node) ||
		!('properties' in node) ||
		!Array.isArray(node.properties)
	) {
		return node;
	}

	return {
		...node,
		properties: node.properties.map((property) => {
			if (property.name === 'public' || hasPublicDisplayCondition(property, true)) {
				return hideProperty(property);
			}

			if (hasPublicDisplayCondition(property, false)) {
				return stripPublicDisplayCondition(property);
			}

			return property;
		}),
	} as T;
}
