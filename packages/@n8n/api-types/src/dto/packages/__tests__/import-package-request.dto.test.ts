import {
	ImportPackageRequestDto,
	IMPORT_PACKAGE_REQUEST_FORM_FIELDS,
} from '../import-package-request.dto';
import { withPackageFile } from './with-package-file';

describe('ImportPackageRequestDto', () => {
	it('accepts omitted routing fields and defaults credential modes', () => {
		const result = ImportPackageRequestDto.safeParse(
			withPackageFile({
				conflictPolicy: 'fail',
			}),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(
				withPackageFile({
					credentialMatchingMode: 'id-only',
					credentialMissingMode: 'create-stub',
					credentialConflictPolicy: 'keep-existing',
					bindings: {},
					conflictPolicy: 'fail',
					publishingPolicy: 'preserve-published-state',
					idPolicy: 'source',
					missingNodeTypeMode: 'fail',
					projectConflictPolicy: 'merge',
					overwriteDeletionPolicy: 'archive',
					dataTableMatchingMode: 'by-id',
					dataTableMissingMode: 'create',
					dataTableSchemaConflictPolicy: 'keep-existing',
					variableMissingMode: 'create-with-value',
					variableConflictPolicy: 'keep-existing',
					tagMissingMode: 'create',
					tagConflictPolicy: 'skip',
				}),
			);
		}
	});

	it('treats empty projectId and folderId as omitted', () => {
		const result = ImportPackageRequestDto.safeParse(
			withPackageFile({
				projectId: '',
				folderId: '   ',
				conflictPolicy: 'fail',
			}),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(
				withPackageFile({
					credentialMatchingMode: 'id-only',
					credentialMissingMode: 'create-stub',
					credentialConflictPolicy: 'keep-existing',
					bindings: {},
					conflictPolicy: 'fail',
					publishingPolicy: 'preserve-published-state',
					idPolicy: 'source',
					missingNodeTypeMode: 'fail',
					projectConflictPolicy: 'merge',
					overwriteDeletionPolicy: 'archive',
					dataTableMatchingMode: 'by-id',
					dataTableMissingMode: 'create',
					dataTableSchemaConflictPolicy: 'keep-existing',
					variableMissingMode: 'create-with-value',
					variableConflictPolicy: 'keep-existing',
					tagMissingMode: 'create',
					tagConflictPolicy: 'skip',
				}),
			);
		}
	});

	it('trims non-empty ids', () => {
		const result = ImportPackageRequestDto.safeParse(
			withPackageFile({
				projectId: '  proj-1  ',
				folderId: 'fld-1',
				conflictPolicy: 'new-version',
			}),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(
				withPackageFile({
					projectId: 'proj-1',
					folderId: 'fld-1',
					credentialMatchingMode: 'id-only',
					credentialMissingMode: 'create-stub',
					credentialConflictPolicy: 'keep-existing',
					bindings: {},
					conflictPolicy: 'new-version',
					publishingPolicy: 'preserve-published-state',
					idPolicy: 'source',
					missingNodeTypeMode: 'fail',
					projectConflictPolicy: 'merge',
					overwriteDeletionPolicy: 'archive',
					dataTableMatchingMode: 'by-id',
					dataTableMissingMode: 'create',
					dataTableSchemaConflictPolicy: 'keep-existing',
					variableMissingMode: 'create-with-value',
					variableConflictPolicy: 'keep-existing',
					tagMissingMode: 'create',
					tagConflictPolicy: 'skip',
				}),
			);
		}
	});

	it('rejects a request missing the package file', () => {
		expect(
			ImportPackageRequestDto.safeParse({
				projectId: 'proj-1',
				conflictPolicy: 'skip',
			}).success,
		).toBe(false);
	});

	it.each([
		['workflowConflictPolicy', 'skip'],
		['workflowIdPolicy', 'source'],
		['agentIdPolicy', 'source'],
		['workflowPublishingPolicy', 'publish-all'],
		['agentPublishingPolicy', 'publish-all'],
	])('rejects the old %s field', (field, value) => {
		expect(
			ImportPackageRequestDto.safeParse(
				withPackageFile({
					projectId: 'proj-1',
					conflictPolicy: 'skip',
					[field]: value,
				}),
			).success,
		).toBe(false);
	});

	it('requires conflictPolicy (no default)', () => {
		expect(ImportPackageRequestDto.safeParse(withPackageFile({})).success).toBe(false);
	});

	it.each(['id-only', 'name-and-type', 'type-only'] as const)(
		'accepts %s as a credentialMatchingMode value',
		(credentialMatchingMode) => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					credentialMatchingMode,
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.credentialMatchingMode).toBe(credentialMatchingMode);
			}
		},
	);

	it('rejects unsupported credentialMatchingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse(
				withPackageFile({
					credentialMatchingMode: 'fuzzy-match',
					conflictPolicy: 'fail',
				}),
			).success,
		).toBe(false);
	});

	it('rejects unsupported credentialMissingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse(
				withPackageFile({
					credentialMissingMode: 'auto-create',
					conflictPolicy: 'fail',
				}),
			).success,
		).toBe(false);
	});

	it.each(['create', 'must-preexist', 'do-nothing'] as const)(
		'accepts %s as a dataTableMissingMode value',
		(dataTableMissingMode) => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					dataTableMissingMode,
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dataTableMissingMode).toBe(dataTableMissingMode);
			}
		},
	);

	it('rejects unsupported dataTableMissingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse(
				withPackageFile({
					dataTableMissingMode: 'recreate',
					conflictPolicy: 'fail',
				}),
			).success,
		).toBe(false);
	});

	it('rejects unsupported dataTableMatchingMode values', () => {
		expect(
			ImportPackageRequestDto.safeParse(
				withPackageFile({
					dataTableMatchingMode: 'by-name',
					conflictPolicy: 'fail',
				}),
			).success,
		).toBe(false);
	});

	it.each(['keep-existing', 'fail', 'overwrite', 'overwrite-non-destructive'] as const)(
		'accepts %s as a dataTableSchemaConflictPolicy value',
		(dataTableSchemaConflictPolicy) => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					dataTableSchemaConflictPolicy,
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dataTableSchemaConflictPolicy).toBe(dataTableSchemaConflictPolicy);
			}
		},
	);

	it('rejects unsupported dataTableSchemaConflictPolicy values', () => {
		expect(
			ImportPackageRequestDto.safeParse(
				withPackageFile({
					dataTableSchemaConflictPolicy: 'merge',
					conflictPolicy: 'fail',
				}),
			).success,
		).toBe(false);
	});

	it('accepts create-stub credentialMissingMode', () => {
		const result = ImportPackageRequestDto.safeParse(
			withPackageFile({
				credentialMissingMode: 'create-stub',
				conflictPolicy: 'fail',
			}),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.credentialMissingMode).toBe('create-stub');
		}
	});

	it('accepts create-with-values credentialMissingMode', () => {
		const result = ImportPackageRequestDto.safeParse(
			withPackageFile({
				credentialMissingMode: 'create-with-values',
				conflictPolicy: 'fail',
			}),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.credentialMissingMode).toBe('create-with-values');
		}
	});

	it('parses bindings from a JSON object string keyed by entity type', () => {
		const result = ImportPackageRequestDto.safeParse(
			withPackageFile({
				bindings: '{"credentials":{"source-cred":"target-cred"}}',
				conflictPolicy: 'fail',
			}),
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.bindings).toEqual({ credentials: { 'source-cred': 'target-cred' } });
		}
	});

	it.each([
		{ name: 'invalid JSON', bindings: 'not json' },
		{ name: 'array JSON', bindings: '[]' },
		{ name: 'non-object credentials map', bindings: '{"credentials":"nope"}' },
		{ name: 'non-string target id', bindings: '{"credentials":{"source":1}}' },
		{ name: 'empty source id', bindings: '{"credentials":{"":"target"}}' },
		{ name: 'empty target id', bindings: '{"credentials":{"source":""}}' },
		{ name: 'a misspelled credentials key', bindings: '{"credential":{"source":"target"}}' },
		{ name: 'an unsupported workflows key', bindings: '{"workflows":{"source":"target"}}' },
		{ name: 'an unsupported agents key', bindings: '{"agents":{"source":"target"}}' },
		{
			name: 'a mix of known and unknown keys',
			bindings: '{"credentials":{"source":"target"},"nope":{"a":"b"}}',
		},
	])('rejects bindings with $name', ({ bindings }) => {
		expect(
			ImportPackageRequestDto.safeParse(
				withPackageFile({
					bindings,
					conflictPolicy: 'fail',
				}),
			).success,
		).toBe(false);
	});

	it('names the offending key when bindings use an unknown entity type', () => {
		const result = ImportPackageRequestDto.safeParse(
			withPackageFile({
				bindings: '{"credential":{"source":"target"}}',
				conflictPolicy: 'fail',
			}),
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			const message = result.error.errors.map((issue) => issue.message).join('; ');
			expect(message).toContain('Unrecognized key');
			expect(message).toContain('credential');
		}
	});

	// An omitted folder policy follows the project policy. Other policies have fixed defaults.
	describe.each([
		{ field: 'idPolicy', values: ['source'], expected: 'source' },
		{
			field: 'publishingPolicy',
			values: ['preserve-published-state', 'match-source', 'publish-all', 'unpublish-all'],
			expected: 'preserve-published-state',
		},
		{ field: 'projectConflictPolicy', values: ['merge', 'fail', 'overwrite'], expected: 'merge' },
		{ field: 'folderConflictPolicy', values: ['merge', 'fail', 'overwrite'], expected: undefined },
		{ field: 'overwriteDeletionPolicy', values: ['archive', 'hard-delete'], expected: 'archive' },
	] as const)('$field', ({ field, values, expected }) => {
		it(`defaults to ${expected ?? 'undefined'} when omitted`, () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) expect(result.data[field]).toBe(expected);
		});

		it('accepts every supported value', () => {
			for (const value of values) {
				const result = ImportPackageRequestDto.safeParse(
					withPackageFile({
						conflictPolicy: 'fail',
						[field]: value,
					}),
				);
				expect(result.success).toBe(true);
				if (result.success) expect(result.data[field]).toBe(value);
			}
		});

		it('rejects an unsupported value', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						conflictPolicy: 'fail',
						[field]: 'not-a-policy',
					}),
				).success,
			).toBe(false);
		});

		it('is accepted as a multipart form field', () => {
			expect(IMPORT_PACKAGE_REQUEST_FORM_FIELDS).toContain(field);
		});
	});

	describe('missingNodeTypeMode', () => {
		it('defaults to "fail" when omitted', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.missingNodeTypeMode).toBe('fail');
			}
		});

		it('accepts "import-anyway"', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
					missingNodeTypeMode: 'import-anyway',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.missingNodeTypeMode).toBe('import-anyway');
			}
		});

		it('rejects unsupported missingNodeTypeMode values', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						conflictPolicy: 'fail',
						missingNodeTypeMode: 'skip',
					}),
				).success,
			).toBe(false);
		});

		it('is accepted as a multipart form field', () => {
			expect(IMPORT_PACKAGE_REQUEST_FORM_FIELDS).toContain('missingNodeTypeMode');
		});
	});

	it.each([
		{
			name: 'non-string projectId',
			request: withPackageFile({ projectId: 1, conflictPolicy: 'fail' }),
		},
		{
			name: 'non-string folderId',
			request: withPackageFile({ folderId: false, conflictPolicy: 'fail' }),
		},
		{
			name: 'unknown conflictPolicy',
			request: withPackageFile({ conflictPolicy: 'overwrite' }),
		},
	])('rejects $name', ({ request }) => {
		expect(ImportPackageRequestDto.safeParse(request).success).toBe(false);
	});

	describe('blank enum fields fall back to their defaults', () => {
		it('treats an empty-string credentialMatchingMode as unset and defaults it', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					credentialMatchingMode: '',
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.credentialMatchingMode).toBe('id-only');
			}
		});

		it('treats a whitespace-only credentialMatchingMode as unset and defaults it', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					credentialMatchingMode: '   ',
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.credentialMatchingMode).toBe('id-only');
			}
		});

		it('defaults credentialMatchingMode when omitted', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.credentialMatchingMode).toBe('id-only');
			}
		});

		it('preserves an explicit credentialMatchingMode value', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					credentialMatchingMode: 'type-only',
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.credentialMatchingMode).toBe('type-only');
			}
		});

		it('still rejects a non-empty invalid credentialMatchingMode value', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						credentialMatchingMode: 'fuzzy-match',
						conflictPolicy: 'fail',
					}),
				).success,
			).toBe(false);
		});

		// Every optional enum field must treat a blank value as unset and fall back to its default.
		// conflictPolicy is excluded: it has no default, so a blank value is rejected instead.
		it.each([
			{ field: 'credentialMatchingMode', expected: 'id-only' },
			{ field: 'credentialMissingMode', expected: 'create-stub' },
			{ field: 'credentialConflictPolicy', expected: 'keep-existing' },
			{ field: 'publishingPolicy', expected: 'preserve-published-state' },
			{ field: 'idPolicy', expected: 'source' },
			{ field: 'missingNodeTypeMode', expected: 'fail' },
			{ field: 'projectConflictPolicy', expected: 'merge' },
			{ field: 'overwriteDeletionPolicy', expected: 'archive' },
			{ field: 'dataTableMatchingMode', expected: 'by-id' },
			{ field: 'dataTableMissingMode', expected: 'create' },
			{ field: 'dataTableSchemaConflictPolicy', expected: 'keep-existing' },
			{ field: 'variableMissingMode', expected: 'create-with-value' },
			{ field: 'variableConflictPolicy', expected: 'keep-existing' },
			{ field: 'tagMissingMode', expected: 'create' },
			{ field: 'tagConflictPolicy', expected: 'skip' },
		] as const)('defaults $field when the value is an empty string', ({ field, expected }) => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
					[field]: '',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data[field]).toBe(expected);
			}
		});

		it('still rejects a non-empty invalid value for a blank-coercing enum field', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						conflictPolicy: 'fail',
						publishingPolicy: 'not-a-policy',
					}),
				).success,
			).toBe(false);
		});

		it('rejects a blank conflictPolicy (no default)', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						conflictPolicy: '',
					}),
				).success,
			).toBe(false);
		});
	});

	describe('variableMissingMode', () => {
		it('defaults variableMissingMode to create-with-value when omitted', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.variableMissingMode).toBe('create-with-value');
			}
		});

		it.each(['do-nothing', 'must-preexist', 'create-stub', 'create-with-value'] as const)(
			'accepts %s as a variableMissingMode value',
			(variableMissingMode) => {
				const result = ImportPackageRequestDto.safeParse(
					withPackageFile({
						variableMissingMode,
						conflictPolicy: 'fail',
					}),
				);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.variableMissingMode).toBe(variableMissingMode);
				}
			},
		);

		it('rejects unsupported variableMissingMode values', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						variableMissingMode: 'invent-variables',
						conflictPolicy: 'fail',
					}),
				).success,
			).toBe(false);
		});
	});

	describe('variableConflictPolicy', () => {
		it('defaults variableConflictPolicy to keep-existing when omitted', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.variableConflictPolicy).toBe('keep-existing');
			}
		});

		it.each(['keep-existing', 'overwrite', 'fail'] as const)(
			'accepts %s as a variableConflictPolicy value',
			(variableConflictPolicy) => {
				const result = ImportPackageRequestDto.safeParse(
					withPackageFile({
						variableConflictPolicy,
						conflictPolicy: 'fail',
					}),
				);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.variableConflictPolicy).toBe(variableConflictPolicy);
				}
			},
		);

		it('rejects unsupported variableConflictPolicy values', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						variableConflictPolicy: 'merge-values',
						conflictPolicy: 'fail',
					}),
				).success,
			).toBe(false);
		});
	});

	describe('credentialConflictPolicy', () => {
		it('defaults credentialConflictPolicy to keep-existing when omitted', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.credentialConflictPolicy).toBe('keep-existing');
			}
		});

		it.each(['keep-existing', 'overwrite', 'fail'] as const)(
			'accepts %s as a credentialConflictPolicy value',
			(credentialConflictPolicy) => {
				const result = ImportPackageRequestDto.safeParse(
					withPackageFile({
						credentialConflictPolicy,
						conflictPolicy: 'fail',
					}),
				);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.credentialConflictPolicy).toBe(credentialConflictPolicy);
				}
			},
		);

		it('rejects unsupported credentialConflictPolicy values', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						credentialConflictPolicy: 'merge',
						conflictPolicy: 'fail',
					}),
				).success,
			).toBe(false);
		});

		it('is accepted as a multipart form field', () => {
			expect(IMPORT_PACKAGE_REQUEST_FORM_FIELDS).toContain('credentialConflictPolicy');
		});
	});

	describe('tagMissingMode', () => {
		it('defaults tagMissingMode to create when omitted', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.tagMissingMode).toBe('create');
			}
		});

		it.each(['create', 'do-nothing'] as const)(
			'accepts %s as a tagMissingMode value',
			(tagMissingMode) => {
				const result = ImportPackageRequestDto.safeParse(
					withPackageFile({
						tagMissingMode,
						conflictPolicy: 'fail',
					}),
				);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.tagMissingMode).toBe(tagMissingMode);
				}
			},
		);

		it('rejects unsupported tagMissingMode values', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						tagMissingMode: 'must-preexist',
						conflictPolicy: 'fail',
					}),
				).success,
			).toBe(false);
		});
	});

	describe('tagConflictPolicy', () => {
		it('defaults tagConflictPolicy to skip when omitted', () => {
			const result = ImportPackageRequestDto.safeParse(
				withPackageFile({
					conflictPolicy: 'fail',
				}),
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.tagConflictPolicy).toBe('skip');
			}
		});

		it.each(['skip', 'fail', 'rename'] as const)(
			'accepts %s as a tagConflictPolicy value',
			(tagConflictPolicy) => {
				const result = ImportPackageRequestDto.safeParse(
					withPackageFile({
						tagConflictPolicy,
						conflictPolicy: 'fail',
					}),
				);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.tagConflictPolicy).toBe(tagConflictPolicy);
				}
			},
		);

		it('rejects unsupported tagConflictPolicy values', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						tagConflictPolicy: 'overwrite',
						conflictPolicy: 'fail',
					}),
				).success,
			).toBe(false);
		});
	});

	describe('variableParentPolicy', () => {
		it.each([
			withPackageFile({ conflictPolicy: 'fail' }),
			withPackageFile({ conflictPolicy: 'fail', variableParentPolicy: '  ' }),
		])('leaves variableParentPolicy undefined rather than defaulting it: %o', (input) => {
			const result = ImportPackageRequestDto.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.variableParentPolicy).toBeUndefined();
			}
		});

		it.each(['project', 'global'] as const)(
			'accepts %s as a variableParentPolicy value',
			(variableParentPolicy) => {
				const result = ImportPackageRequestDto.safeParse(
					withPackageFile({
						variableParentPolicy,
						conflictPolicy: 'fail',
					}),
				);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.variableParentPolicy).toBe(variableParentPolicy);
				}
			},
		);

		it('rejects unsupported variableParentPolicy values', () => {
			expect(
				ImportPackageRequestDto.safeParse(
					withPackageFile({
						variableParentPolicy: 'owner-project',
						conflictPolicy: 'fail',
					}),
				).success,
			).toBe(false);
		});
	});
});
