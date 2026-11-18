import type {
	AgentIntegrationConfig,
	DocPageProperties,
	DocPageTrigger,
	DocScheduleRule,
	StoredAgentConfig,
} from '@n8n/api-types';
import { isDraftIntegration } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { DistributiveOmit } from '@n8n/utils/types';
import { FORM_TRIGGER_PATH_IDENTIFIER, getNodeWebhookUrl } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { entryPoints } from './doc-page-kind';

/** Base URLs of the production endpoints, without a trailing slash. */
export type TriggerUrls = {
	webhook: string;
	form: string;
	/** False when the instance disables public chat. */
	publicChat: boolean;
};

const WEBHOOK_AUTHS = ['none', 'basicAuth', 'headerAuth', 'jwtAuth'] as const;
type WebhookAuth = (typeof WEBHOOK_AUTHS)[number];
const isWebhookAuth = (value: unknown): value is WebhookAuth =>
	WEBHOOK_AUTHS.some((auth) => auth === value);

const SCHEDULE_UNITS = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'] as const;
type ScheduleUnit = (typeof SCHEDULE_UNITS)[number];
const isScheduleUnit = (value: unknown): value is ScheduleUnit =>
	SCHEDULE_UNITS.some((unit) => unit === value);

// The Schedule Trigger node defaults. n8n does not store a parameter that has its default value.
const DEFAULT_INTERVAL: Record<ScheduleUnit, number> = {
	seconds: 30,
	minutes: 5,
	hours: 1,
	days: 1,
	weeks: 1,
	months: 1,
};

const str = (value: unknown, fallback: string) =>
	typeof value === 'string' && value !== '' ? value : fallback;
const num = (value: unknown, fallback: number) => (typeof value === 'number' ? value : fallback);

/** The entry points of a published workflow. Reads only the parameters that the page shows. */
export function workflowProperties(
	workflowId: string,
	nodes: INode[],
	urls: TriggerUrls,
): DocPageProperties {
	return {
		triggers: entryPoints(nodes).map((node) => ({
			nodeName: node.name,
			nodeType: node.type,
			typeVersion: node.typeVersion,
			...triggerFacts(workflowId, node, urls),
		})),
		agent: null,
	};
}

type TriggerFacts = DistributiveOmit<DocPageTrigger, 'nodeName' | 'nodeType' | 'typeVersion'>;

function triggerFacts(workflowId: string, node: INode, urls: TriggerUrls): TriggerFacts {
	const params = node.parameters;
	switch (node.type) {
		case 'n8n-nodes-base.webhook': {
			const methods =
				params.multipleMethods === true
					? Array.isArray(params.httpMethod)
						? params.httpMethod.filter((m): m is string => typeof m === 'string')
						: ['GET', 'POST']
					: [str(params.httpMethod, 'GET')];
			return {
				type: 'webhook',
				methods,
				url: getNodeWebhookUrl(urls.webhook, workflowId, node, str(params.path, ''), true),
				auth: isWebhookAuth(params.authentication) ? params.authentication : 'none',
			};
		}
		case 'n8n-nodes-base.formTrigger': {
			const options: unknown = params.options;
			const path = str(params.path, isRecord(options) ? str(options.path, '') : '');
			// Version 1 serves the form under the webhook endpoint.
			const url =
				node.typeVersion === 1
					? getNodeWebhookUrl(
							urls.webhook,
							workflowId,
							node,
							`${path}/${FORM_TRIGGER_PATH_IDENTIFIER}`,
							true,
						)
					: getNodeWebhookUrl(urls.form, workflowId, node, path, true);
			return {
				type: 'form',
				url,
				auth: params.authentication === 'basicAuth' ? 'basicAuth' : 'none',
			};
		}
		case '@n8n/n8n-nodes-langchain.chatTrigger':
			return {
				type: 'chat',
				url:
					params.public === true && urls.publicChat
						? getNodeWebhookUrl(urls.webhook, workflowId, node, 'chat')
						: null,
			};
		case 'n8n-nodes-base.scheduleTrigger':
			return { type: 'schedule', rules: scheduleRules(params.rule) };
		case 'n8n-nodes-base.interval': {
			const unit = str(params.unit, 'seconds');
			return {
				type: 'schedule',
				rules: isScheduleUnit(unit) ? [{ every: unit, interval: num(params.interval, 1) }] : [],
			};
		}
		// ponytail: the legacy Cron node keeps its rules in its own format. Parse it if pages need it.
		case 'n8n-nodes-base.cron':
			return { type: 'schedule', rules: [] };
		default:
			return { type: 'event' };
	}
}

function scheduleRules(rule: unknown): DocScheduleRule[] {
	const intervals =
		isRecord(rule) && Array.isArray(rule.interval) ? rule.interval : [{ field: 'days' }];
	return intervals.flatMap((item): DocScheduleRule[] => {
		if (!isRecord(item)) return [];
		const field = str(item.field, 'days');
		if (field === 'cronExpression') return [{ cron: str(item.expression, '') }];
		if (!isScheduleUnit(field)) return [];

		const interval = num(item[`${field}Interval`], DEFAULT_INTERVAL[field]);
		if (field === 'seconds' || field === 'minutes') return [{ every: field, interval }];

		const minute = num(item.triggerAtMinute, 0);
		if (field === 'hours') return [{ every: field, interval, minute }];

		const at = { every: field, interval, hour: num(item.triggerAtHour, 0), minute };
		if (field === 'weeks') {
			const days = Array.isArray(item.triggerAtDay) ? item.triggerAtDay : [0];
			return [{ ...at, weekdays: days.filter((d): d is number => typeof d === 'number') }];
		}
		if (field === 'months') return [{ ...at, dayOfMonth: num(item.triggerAtDayOfMonth, 1) }];
		return [at];
	});
}

/** The model and channels of a published Agent. */
export function agentProperties(agent: {
	activeVersion?: { schema: StoredAgentConfig | null } | null;
	integrations: AgentIntegrationConfig[] | null;
}): DocPageProperties {
	const integrations = (agent.integrations ?? []).filter((entry) => !isDraftIntegration(entry));
	return {
		triggers: [],
		agent: {
			model: agent.activeVersion?.schema?.model || null,
			channels: [...new Set(integrations.map((entry) => entry.type))],
		},
	};
}
