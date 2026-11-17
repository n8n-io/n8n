import { Service } from '@n8n/di';

import { extractVariableNames, type VariableReferenceSource } from './variable-references';
import type { WorkflowVariableRequirement } from './variable.types';
import type { RequirementsExtractor } from '../requirements-extractor';

@Service()
export class VariableRequirementsExtractor
	implements RequirementsExtractor<WorkflowVariableRequirement>
{
	extract(workflow: VariableReferenceSource & { id: string }): WorkflowVariableRequirement[] {
		return this.extractNames(workflow).map((variableName) => ({
			workflowId: workflow.id,
			variableName,
		}));
	}

	extractNames(source: VariableReferenceSource): string[] {
		return extractVariableNames(source);
	}
}
