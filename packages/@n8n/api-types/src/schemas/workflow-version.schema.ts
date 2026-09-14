import { z } from 'zod';

export const WORKFLOW_VERSION_NAME_MAX_LENGTH = 128;
export const WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH = 2048;

const nameTooLong = {
	message: `Version name cannot be longer than ${WORKFLOW_VERSION_NAME_MAX_LENGTH} characters`,
};

export const workflowVersionNameSchema = z
	.string()
	.max(WORKFLOW_VERSION_NAME_MAX_LENGTH, nameTooLong)
	.optional();

export const requiredWorkflowVersionNameSchema = z
	.string()
	.trim()
	.min(1, { message: 'Version name is required' })
	.max(WORKFLOW_VERSION_NAME_MAX_LENGTH, nameTooLong);

export const workflowVersionDescriptionSchema = z
	.string()
	.max(WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH, {
		message: `Version description cannot be longer than ${WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH} characters`,
	})
	.optional();
