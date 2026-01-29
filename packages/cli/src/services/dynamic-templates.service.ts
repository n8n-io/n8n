import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import axios from 'axios';
import type { IPersonalizationSurveyAnswersV4 } from 'n8n-workflow';

export const DYNAMIC_TEMPLATES_URL = 'https://dynamic-templates.n8n.io/templates';
export const REQUEST_TIMEOUT_MS = 5000;

type DynamicTemplate = Record<string, unknown>;

/**
 * Unified user context for dynamic templates personalization.
 * Maps data from both self-hosted (personalizationAnswers) and cloud (information + selectedApps) sources.
 */
export interface DynamicTemplatesUserContext {
	companySize?: string;
	companyType?: string;

	role?: string;

	source?: string;

	codingSkill?: string[];
	hasUsedAutomation?: string;

	automationGoals?: string[];
	usageModes?: string[];

	selectedApps?: string[];

	companyIndustry?: string[];
}

/**
 * Request structure for fetching dynamic templates.
 * Separates user profile data from service metadata.
 */
export interface DynamicTemplatesRequest {
	userContext?: DynamicTemplatesUserContext;
	// metadata props like posthogTemplatesVariant can be added here
}

/** Cloud survey UUID to field name mapping */
const CLOUD_UUID_FIELD_MAP: Record<string, string> = {
	'eb4c8e07-e906-4b6d-9a7d-836c0438166c': 'codingSkill',
	'2945eae8-6601-49c0-b5f9-69fdd1364aa8': 'hasUsedAutomation',
};

/**
 * Maps personalization data from self-hosted and cloud sources to a unified format.
 */
export function mapToUnifiedUserContext(
	personalizationAnswers?: IPersonalizationSurveyAnswersV4 | null,
	selectedApps?: string[],
	cloudInformation?: Record<string, string | string[]>,
): DynamicTemplatesUserContext {
	const context: DynamicTemplatesUserContext = {};

	// Map self-hosted fields from personalizationAnswers
	if (personalizationAnswers) {
		if (personalizationAnswers.companySize) {
			context.companySize = personalizationAnswers.companySize;
		}
		if (personalizationAnswers.companyType) {
			context.companyType = personalizationAnswers.companyType;
		}
		if (personalizationAnswers.role) {
			context.role = personalizationAnswers.role;
		}
		if (personalizationAnswers.reportedSource) {
			context.source = personalizationAnswers.reportedSource;
		}
		if (personalizationAnswers.automationGoalDevops) {
			context.automationGoals = personalizationAnswers.automationGoalDevops;
		}
		if (personalizationAnswers.usageModes) {
			context.usageModes = personalizationAnswers.usageModes;
		}
		if (personalizationAnswers.companyIndustryExtended) {
			context.companyIndustry = personalizationAnswers.companyIndustryExtended;
		}
	}

	// Map cloud fields (override self-hosted values if present)
	if (cloudInformation) {
		const companySize = cloudInformation.what_is_the_size_of_your_company;
		if (companySize && typeof companySize === 'string') {
			context.companySize = companySize;
		}

		const team = cloudInformation.what_team_are_you_on;
		if (team && typeof team === 'string') {
			context.role = team;
		}

		const source = cloudInformation.how_did_you_hear_about_n8n;
		if (source && typeof source === 'string') {
			context.source = source;
		}

		// Map UUID fields to readable names
		for (const [uuid, fieldName] of Object.entries(CLOUD_UUID_FIELD_MAP)) {
			const value = cloudInformation[uuid];
			if (value !== undefined) {
				if (fieldName === 'codingSkill') {
					context.codingSkill = Array.isArray(value) ? value : [value];
				} else if (fieldName === 'hasUsedAutomation' && typeof value === 'string') {
					context.hasUsedAutomation = value;
				}
			}
		}
	}

	// Cloud-only: selectedApps
	if (selectedApps?.length) {
		context.selectedApps = selectedApps;
	}

	return context;
}

@Service()
export class DynamicTemplatesService {
	constructor(private readonly logger: Logger) {}

	async fetchDynamicTemplates(request: DynamicTemplatesRequest): Promise<DynamicTemplate[]> {
		try {
			const params: Record<string, string> = {};

			// Add user context as JSON-encoded query parameter if provided
			if (request.userContext && Object.keys(request.userContext).length > 0) {
				params.userContext = JSON.stringify(request.userContext);
			}

			const response = await axios.get<{ templates: DynamicTemplate[] }>(DYNAMIC_TEMPLATES_URL, {
				headers: { 'Content-Type': 'application/json' },
				timeout: REQUEST_TIMEOUT_MS,
				params,
			});
			return response.data.templates;
		} catch (error) {
			this.logger.error('Error fetching dynamic templates', { error });
			throw error;
		}
	}
}
