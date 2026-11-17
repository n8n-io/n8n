import type {
	AgentToolGuardrailConfig,
	AgentToolGuardrailKind,
	ToolGuardrailPiiEntity,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

import type { AgentJsonConfig } from '../types';

export const TOOL_GUARDRAIL_KINDS: readonly AgentToolGuardrailKind[] = [
	'keywords',
	'jailbreak',
	'nsfw',
	'pii',
	'secretKeys',
	'topicalAlignment',
	'urls',
] as const;

export function guardrailKindLabelKey(kind: AgentToolGuardrailKind): BaseTextKey {
	return `agents.builder.guardrails.kind.${kind}` as BaseTextKey;
}

/** Display labels for the PII entities, mirroring the Guardrails node's PII_NAME_MAP. */
export const PII_ENTITY_LABELS: Record<ToolGuardrailPiiEntity, string> = {
	CREDIT_CARD: 'Credit card',
	CRYPTO: 'Crypto',
	DATE_TIME: 'Date time',
	EMAIL_ADDRESS: 'Email address',
	IBAN_CODE: 'IBAN code',
	IP_ADDRESS: 'IP address',
	LOCATION: 'Location',
	PHONE_NUMBER: 'Phone number',
	MEDICAL_LICENSE: 'Medical license',
	US_BANK_NUMBER: 'US bank number',
	US_DRIVER_LICENSE: 'US driver license',
	US_ITIN: 'US ITIN',
	US_PASSPORT: 'US passport',
	US_SSN: 'US SSN',
	UK_NHS: 'UK NHS',
	UK_NINO: 'UK NINO',
	ES_NIF: 'ES NIF',
	ES_NIE: 'ES NIE',
	IT_FISCAL_CODE: 'IT fiscal code',
	IT_DRIVER_LICENSE: 'IT driver license',
	IT_VAT_CODE: 'IT VAT code',
	IT_PASSPORT: 'IT passport',
	IT_IDENTITY_CARD: 'IT identity card',
	PL_PESEL: 'PL PESEL',
	SG_NRIC_FIN: 'SG NRIC FIN',
	SG_UEN: 'SG UEN',
	AU_ABN: 'AU ABN',
	AU_ACN: 'AU ACN',
	AU_TFN: 'AU TFN',
	AU_MEDICARE: 'AU Medicare',
	IN_PAN: 'IN PAN',
	IN_AADHAAR: 'IN Aadhaar',
	IN_VEHICLE_REGISTRATION: 'IN vehicle registration',
	IN_VOTER: 'IN voter',
	IN_PASSPORT: 'IN passport',
	FI_PERSONAL_IDENTITY_CODE: 'FI personal identity code',
};

/** Slug of the name that passes the schema's `[A-Za-z0-9_-]` id check. */
export function slugifyGuardrailId(name: string, kind: AgentToolGuardrailKind): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/_{2,}/g, '_')
		.replace(/^_+|_+$/g, '');
	return slug || `${kind}_${Math.random().toString(36).slice(2, 8)}`;
}

export function configuredToolGuardrails(
	config: AgentJsonConfig | null,
): AgentToolGuardrailConfig[] {
	return config?.config?.guardrails?.tools ?? [];
}

/** Builds the update payload for the guardrails list; `onConfigFieldUpdate` shallow-assigns top-level keys. */
export function withToolGuardrails(
	config: AgentJsonConfig | null,
	tools: AgentToolGuardrailConfig[] | undefined,
): Partial<AgentJsonConfig> {
	return {
		config: {
			...config?.config,
			guardrails: {
				...config?.config?.guardrails,
				tools,
			},
		},
	};
}
