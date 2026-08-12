/**
 * Shared in-sandbox runtime: harness report validation.
 *
 * Literal copy of the `harnessReportSchema` shape from
 * `one-off-task/contracts.ts` — the report_result extension runs under pi's
 * jiti loader inside the sandbox and cannot import workspace modules (or
 * zod). `harness-report-runtime.test.ts` validates shared fixtures against
 * both this validator and the zod schema so the copies cannot drift.
 *
 * Mirrors zod's default object semantics: unknown keys are stripped from the
 * normalized report, optional fields may be absent but must be well-typed
 * when present.
 */
export const REPORT_RUNTIME_SOURCE = String.raw`
// ── shared runtime: report validation ────────────────────────────────────────

/**
 * Validates a candidate harness report. Returns
 * { ok: true, report } with unknown keys stripped, or { ok: false, errors }.
 */
function validateHarnessReport(value) {
	const errors = [];
	const isRecord = (candidate) =>
		typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);

	const requireString = (obj, key, path) => {
		if (typeof obj[key] !== 'string') {
			errors.push(path + '.' + key + ' must be a string');
			return '';
		}
		return obj[key];
	};

	const optionalString = (obj, key, path) => {
		if (obj[key] === undefined) return undefined;
		return requireString(obj, key, path);
	};

	const readActions = (obj) => {
		if (!Array.isArray(obj.actions)) {
			errors.push('report.actions must be an array');
			return [];
		}
		return obj.actions.map((item, index) => {
			const itemPath = 'report.actions[' + index + ']';
			if (!isRecord(item)) {
				errors.push(itemPath + ' must be an object');
				return { description: '' };
			}
			const action = { description: requireString(item, 'description', itemPath) };
			const service = optionalString(item, 'service', itemPath);
			if (service !== undefined) action.service = service;
			return action;
		});
	};

	if (!isRecord(value)) return { ok: false, errors: ['report must be an object'] };

	if (value.status === 'completed') {
		const report = {
			status: 'completed',
			summary: requireString(value, 'summary', 'report'),
			actions: readActions(value),
			verification: [],
			artifacts: [],
		};
		if (!Array.isArray(value.verification)) {
			errors.push('report.verification must be an array');
		} else {
			report.verification = value.verification.map((item, index) => {
				const itemPath = 'report.verification[' + index + ']';
				if (!isRecord(item)) {
					errors.push(itemPath + ' must be an object');
					return { check: '', result: '', passed: false };
				}
				if (typeof item.passed !== 'boolean') errors.push(itemPath + '.passed must be a boolean');
				return {
					check: requireString(item, 'check', itemPath),
					result: requireString(item, 'result', itemPath),
					passed: item.passed === true,
				};
			});
		}
		if (!Array.isArray(value.artifacts)) {
			errors.push('report.artifacts must be an array');
		} else {
			report.artifacts = value.artifacts.map((item, index) => {
				const itemPath = 'report.artifacts[' + index + ']';
				if (!isRecord(item)) {
					errors.push(itemPath + ' must be an object');
					return { label: '', url: '' };
				}
				return {
					label: requireString(item, 'label', itemPath),
					url: requireString(item, 'url', itemPath),
				};
			});
		}
		return errors.length > 0 ? { ok: false, errors } : { ok: true, report };
	}

	if (value.status === 'needs_credential') {
		const report = {
			status: 'needs_credential',
			progressSummary: requireString(value, 'progressSummary', 'report'),
			request: { kind: 'existing', credentialName: '' },
		};
		const request = value.request;
		if (!isRecord(request)) {
			errors.push('report.request must be an object');
		} else if (request.kind === 'existing') {
			report.request = {
				kind: 'existing',
				credentialName: requireString(request, 'credentialName', 'report.request'),
			};
		} else if (request.kind === 'new') {
			const normalizedRecipe = { serviceName: '', placeholders: [] };
			const recipe = request.recipe;
			if (!isRecord(recipe)) {
				errors.push('report.request.recipe must be an object');
			} else {
				normalizedRecipe.serviceName = requireString(recipe, 'serviceName', 'report.request.recipe');
				if (!Array.isArray(recipe.placeholders)) {
					errors.push('report.request.recipe.placeholders must be an array');
				} else {
					normalizedRecipe.placeholders = recipe.placeholders.map((item, index) => {
						const itemPath = 'report.request.recipe.placeholders[' + index + ']';
						if (!isRecord(item)) {
							errors.push(itemPath + ' must be an object');
							return { name: '', title: '' };
						}
						const placeholder = {
							name: requireString(item, 'name', itemPath),
							title: requireString(item, 'title', itemPath),
						};
						const info = optionalString(item, 'info', itemPath);
						if (info !== undefined) placeholder.info = info;
						return placeholder;
					});
				}
				const docsUrl = optionalString(recipe, 'docsUrl', 'report.request.recipe');
				if (docsUrl !== undefined) normalizedRecipe.docsUrl = docsUrl;
				const testUrl = optionalString(recipe, 'testUrl', 'report.request.recipe');
				if (testUrl !== undefined) normalizedRecipe.testUrl = testUrl;
			}
			report.request = { kind: 'new', recipe: normalizedRecipe };
		} else {
			errors.push('report.request.kind must be "existing" or "new"');
		}
		return errors.length > 0 ? { ok: false, errors } : { ok: true, report };
	}

	if (value.status === 'failed') {
		const report = {
			status: 'failed',
			reason: requireString(value, 'reason', 'report'),
			actions: readActions(value),
		};
		return errors.length > 0 ? { ok: false, errors } : { ok: true, report };
	}

	return {
		ok: false,
		errors: ['report.status must be "completed", "needs_credential", or "failed"'],
	};
}
`;
