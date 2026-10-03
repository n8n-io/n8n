import { NodeOperationError, type INode } from 'n8n-workflow';

// These resolve to a user sign-in endpoint. None can issue an app-only token, and Entra rejects
// them with an opaque AADSTS code rather than saying which field is wrong.
const MULTI_TENANT_ALIASES = new Set(['common', 'organizations', 'consumers']);

// A tenant is a GUID or a verified domain. The value becomes a path segment of the token URL,
// so anything else is refused rather than allowed to reshape it. The domain form is spelled out
// label by label because a looser character class accepts `.` and `..`, which URL parsing
// collapses, leaving a token request with no tenant in the path at all.
const TENANT_ID_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const TENANT_ID_DOMAIN =
	/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*$/;

/**
 * The node signs in as the application, which Entra allows for a named tenant only. Saved
 * credentials can still hold the old `common` default, so this runs at mint time rather than
 * relying on the credential form.
 */
export function requireTenantId(node: INode, tenantId: string | undefined): string {
	const value = tenantId?.trim() ?? '';

	if (!value) {
		throw new NodeOperationError(
			node,
			'Tenant ID is missing in the selected Azure Entra credential',
		);
	}

	if (MULTI_TENANT_ALIASES.has(value.toLowerCase())) {
		throw new NodeOperationError(node, `Tenant ID cannot be "${value}"`, {
			description:
				'The node signs in as the application, and Entra issues an app-only token for one named tenant. Use the Directory (tenant) ID of the app registration.',
		});
	}

	if (!TENANT_ID_GUID.test(value) && !TENANT_ID_DOMAIN.test(value)) {
		throw new NodeOperationError(node, 'Tenant ID is not a Directory ID or a domain', {
			description: 'Use the Directory (tenant) ID of the app registration.',
		});
	}

	return value;
}
