import type { IAdditionalCredentialOptions, IExecuteData, INode } from 'n8n-workflow';
import { isCredentialExpiredWhenSet } from 'n8n-workflow';

import type { ResolveValueFn } from './pagination';

/**
 * Compile `credentialExpiredWhen` into `shouldRefreshCredentials`.
 * Request helpers evaluate `$response` after the first attempt.
 */
export function withShouldRefreshCredentials(
	additionalCredentialOptions: IAdditionalCredentialOptions | undefined,
	getResolvedValue: ResolveValueFn,
	node: INode,
	itemIndex = 0,
): IAdditionalCredentialOptions | undefined {
	if (!additionalCredentialOptions) {
		return undefined;
	}

	if (additionalCredentialOptions.shouldRefreshCredentials) {
		return additionalCredentialOptions;
	}

	const raw = additionalCredentialOptions.credentialExpiredWhen;
	if (!isCredentialExpiredWhenSet(raw)) {
		return additionalCredentialOptions;
	}

	const executeData: IExecuteData = {
		data: {},
		node,
		source: null,
	};

	return {
		...additionalCredentialOptions,
		shouldRefreshCredentials: (response) => {
			if (raw === true || raw === 'true') {
				return true;
			}

			if (typeof raw !== 'string') {
				return false;
			}

			try {
				const resolved = getResolvedValue(raw, itemIndex, 0, executeData, {
					$response: response,
				});
				return resolved === true;
			} catch {
				// A bad `$response` path must not fail the request. Treat it as "do not refresh".
				return false;
			}
		},
	};
}
