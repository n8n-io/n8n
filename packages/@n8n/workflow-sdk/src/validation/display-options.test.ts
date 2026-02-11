import {
	checkConditions,
	getPropertyValue,
	matchesDisplayOptions,
	type DisplayOptionsContext,
} from './display-options';

describe('checkConditions', () => {
	describe('simple value inclusion (legacy)', () => {
		it('returns true when value is in allowed list', () => {
			const result = checkConditions(['value1', 'value2'], ['value1']);
			expect(result).toBe(true);
		});

		it('returns false when value is not in allowed list', () => {
			const result = checkConditions(['value1', 'value2'], ['value3']);
			expect(result).toBe(false);
		});

		it('returns true when any actual value matches any condition', () => {
			const result = checkConditions(['a', 'b'], ['c', 'b']);
			expect(result).toBe(true);
		});
	});

	describe('_cnd operators', () => {
		it('handles _cnd.eq operator', () => {
			expect(checkConditions([{ _cnd: { eq: 'test' } }], ['test'])).toBe(true);
			expect(checkConditions([{ _cnd: { eq: 'test' } }], ['other'])).toBe(false);
			expect(checkConditions([{ _cnd: { eq: 5 } }], [5])).toBe(true);
			expect(checkConditions([{ _cnd: { eq: 5 } }], [6])).toBe(false);
		});

		it('handles _cnd.not operator', () => {
			expect(checkConditions([{ _cnd: { not: 'test' } }], ['other'])).toBe(true);
			expect(checkConditions([{ _cnd: { not: 'test' } }], ['test'])).toBe(false);
		});

		it('handles _cnd.gte operator', () => {
			expect(checkConditions([{ _cnd: { gte: 3 } }], [3])).toBe(true);
			expect(checkConditions([{ _cnd: { gte: 3 } }], [4])).toBe(true);
			expect(checkConditions([{ _cnd: { gte: 3 } }], [2])).toBe(false);
		});

		it('handles _cnd.lte operator', () => {
			expect(checkConditions([{ _cnd: { lte: 3 } }], [3])).toBe(true);
			expect(checkConditions([{ _cnd: { lte: 3 } }], [2])).toBe(true);
			expect(checkConditions([{ _cnd: { lte: 3 } }], [4])).toBe(false);
		});

		it('handles _cnd.gt operator', () => {
			expect(checkConditions([{ _cnd: { gt: 3 } }], [4])).toBe(true);
			expect(checkConditions([{ _cnd: { gt: 3 } }], [3])).toBe(false);
			expect(checkConditions([{ _cnd: { gt: 3 } }], [2])).toBe(false);
		});

		it('handles _cnd.lt operator', () => {
			expect(checkConditions([{ _cnd: { lt: 3 } }], [2])).toBe(true);
			expect(checkConditions([{ _cnd: { lt: 3 } }], [3])).toBe(false);
			expect(checkConditions([{ _cnd: { lt: 3 } }], [4])).toBe(false);
		});

		it('handles _cnd.between operator', () => {
			expect(checkConditions([{ _cnd: { between: { from: 2, to: 5 } } }], [3])).toBe(true);
			expect(checkConditions([{ _cnd: { between: { from: 2, to: 5 } } }], [2])).toBe(true);
			expect(checkConditions([{ _cnd: { between: { from: 2, to: 5 } } }], [5])).toBe(true);
			expect(checkConditions([{ _cnd: { between: { from: 2, to: 5 } } }], [1])).toBe(false);
			expect(checkConditions([{ _cnd: { between: { from: 2, to: 5 } } }], [6])).toBe(false);
		});

		it('handles _cnd.includes operator (string)', () => {
			expect(checkConditions([{ _cnd: { includes: 'test' } }], ['this is a test string'])).toBe(
				true,
			);
			expect(checkConditions([{ _cnd: { includes: 'test' } }], ['no match here'])).toBe(false);
		});

		it('handles _cnd.startsWith operator', () => {
			expect(checkConditions([{ _cnd: { startsWith: 'hello' } }], ['hello world'])).toBe(true);
			expect(checkConditions([{ _cnd: { startsWith: 'hello' } }], ['world hello'])).toBe(false);
		});

		it('handles _cnd.endsWith operator', () => {
			expect(checkConditions([{ _cnd: { endsWith: 'world' } }], ['hello world'])).toBe(true);
			expect(checkConditions([{ _cnd: { endsWith: 'world' } }], ['world hello'])).toBe(false);
		});

		it('handles _cnd.regex operator', () => {
			expect(checkConditions([{ _cnd: { regex: '^test\\d+$' } }], ['test123'])).toBe(true);
			expect(checkConditions([{ _cnd: { regex: '^test\\d+$' } }], ['test'])).toBe(false);
			expect(checkConditions([{ _cnd: { regex: '^test\\d+$' } }], ['abc'])).toBe(false);
		});

		it('handles _cnd.exists operator', () => {
			expect(checkConditions([{ _cnd: { exists: true } }], ['value'])).toBe(true);
			expect(checkConditions([{ _cnd: { exists: true } }], [0])).toBe(true);
			expect(checkConditions([{ _cnd: { exists: true } }], [null])).toBe(false);
			expect(checkConditions([{ _cnd: { exists: true } }], [undefined])).toBe(false);
			expect(checkConditions([{ _cnd: { exists: true } }], [''])).toBe(false);
		});

		it('handles empty actualValues array', () => {
			// For 'not' operator, empty array means value is not present, so condition is true
			expect(checkConditions([{ _cnd: { not: 'anything' } }], [])).toBe(true);
			// For all other operators, empty array means condition is not met
			expect(checkConditions([{ _cnd: { eq: 'test' } }], [])).toBe(false);
			expect(checkConditions([{ _cnd: { gte: 3 } }], [])).toBe(false);
			expect(checkConditions([{ _cnd: { exists: true } }], [])).toBe(false);
		});

		it('requires all actual values to match for _cnd operators', () => {
			// When there are multiple actual values, ALL must satisfy the condition
			expect(checkConditions([{ _cnd: { gte: 3 } }], [3, 4, 5])).toBe(true);
			expect(checkConditions([{ _cnd: { gte: 3 } }], [3, 4, 2])).toBe(false);
		});
	});

	describe('mixed conditions', () => {
		it('returns true if any condition matches (OR semantics)', () => {
			// Simple value OR _cnd condition
			expect(checkConditions(['exact', { _cnd: { gte: 5 } }], [3])).toBe(false);
			expect(checkConditions(['exact', { _cnd: { gte: 5 } }], ['exact'])).toBe(true);
			expect(checkConditions(['exact', { _cnd: { gte: 5 } }], [6])).toBe(true);
		});
	});
});

describe('getPropertyValue', () => {
	it('returns direct property value', () => {
		const context: DisplayOptionsContext = {
			parameters: { resource: 'ticket', operation: 'create' },
		};
		const result = getPropertyValue(context, 'resource');
		expect(result).toEqual(['ticket']);
	});

	it('returns nested property value', () => {
		const context: DisplayOptionsContext = {
			parameters: { options: { format: 'json' } },
		};
		const result = getPropertyValue(context, 'options.format');
		expect(result).toEqual(['json']);
	});

	it('handles root path with / prefix', () => {
		const context: DisplayOptionsContext = {
			parameters: { nested: { value: 'inner' } },
			rootParameters: { topLevel: 'root-value' },
		};
		const result = getPropertyValue(context, '/topLevel');
		expect(result).toEqual(['root-value']);
	});

	it('handles @version meta-property', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
			nodeVersion: 3,
		};
		const result = getPropertyValue(context, '@version');
		expect(result).toEqual([3]);
	});

	it('returns 0 for @version when not specified', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
		};
		const result = getPropertyValue(context, '@version');
		expect(result).toEqual([0]);
	});

	it('handles @tool meta-property when isToolNode is true', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
			isToolNode: true,
		};
		const result = getPropertyValue(context, '@tool');
		expect(result).toEqual([true]);
	});

	it('handles @tool meta-property when isToolNode is false', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
			isToolNode: false,
		};
		const result = getPropertyValue(context, '@tool');
		expect(result).toEqual([false]);
	});

	it('returns false for @tool when isToolNode is not specified', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
		};
		const result = getPropertyValue(context, '@tool');
		expect(result).toEqual([false]);
	});

	it('unwraps resource locator (__rl) values', () => {
		const context: DisplayOptionsContext = {
			parameters: {
				workflowId: {
					__rl: true,
					mode: 'id',
					value: 'workflow-123',
				},
			},
		};
		const result = getPropertyValue(context, 'workflowId');
		expect(result).toEqual(['workflow-123']);
	});

	it('returns array as-is for array values', () => {
		const context: DisplayOptionsContext = {
			parameters: { tags: ['tag1', 'tag2', 'tag3'] },
		};
		const result = getPropertyValue(context, 'tags');
		expect(result).toEqual(['tag1', 'tag2', 'tag3']);
	});

	it('returns undefined property as array with undefined', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
		};
		const result = getPropertyValue(context, 'nonexistent');
		expect(result).toEqual([undefined]);
	});

	describe('defaults handling', () => {
		it('uses default value when property is not set in parameters', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
				defaults: { multipleMethods: false },
			};
			const result = getPropertyValue(context, 'multipleMethods');
			expect(result).toEqual([false]);
		});

		it('prefers parameter value over default', () => {
			const context: DisplayOptionsContext = {
				parameters: { multipleMethods: true },
				defaults: { multipleMethods: false },
			};
			const result = getPropertyValue(context, 'multipleMethods');
			expect(result).toEqual([true]);
		});

		it('uses default for nested path when property is not set', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
				defaults: { options: { format: 'json' } },
			};
			const result = getPropertyValue(context, 'options.format');
			expect(result).toEqual(['json']);
		});

		it('uses default for root path when property is not set', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
				rootParameters: {},
				defaults: { globalSetting: 'enabled' },
			};
			const result = getPropertyValue(context, '/globalSetting');
			expect(result).toEqual(['enabled']);
		});

		it('returns undefined when neither parameter nor default is set', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
				defaults: { other: 'value' },
			};
			const result = getPropertyValue(context, 'nonexistent');
			expect(result).toEqual([undefined]);
		});
	});
});

describe('matchesDisplayOptions', () => {
	it('returns true when no displayOptions', () => {
		const context: DisplayOptionsContext = {
			parameters: { anything: 'value' },
		};
		const result = matchesDisplayOptions(context, {});
		expect(result).toBe(true);
	});

	it('returns true when all show conditions match', () => {
		const context: DisplayOptionsContext = {
			parameters: { resource: 'ticket', operation: 'create' },
		};
		const result = matchesDisplayOptions(context, {
			show: {
				resource: ['ticket'],
				operation: ['create', 'update'],
			},
		});
		expect(result).toBe(true);
	});

	it('returns false when any show condition fails', () => {
		const context: DisplayOptionsContext = {
			parameters: { resource: 'ticket', operation: 'delete' },
		};
		const result = matchesDisplayOptions(context, {
			show: {
				resource: ['ticket'],
				operation: ['create', 'update'],
			},
		});
		expect(result).toBe(false);
	});

	it('returns false when any hide condition matches', () => {
		const context: DisplayOptionsContext = {
			parameters: { mode: 'simple' },
		};
		const result = matchesDisplayOptions(context, {
			hide: {
				mode: ['simple'],
			},
		});
		expect(result).toBe(false);
	});

	it('returns true when hide condition does not match', () => {
		const context: DisplayOptionsContext = {
			parameters: { mode: 'advanced' },
		};
		const result = matchesDisplayOptions(context, {
			hide: {
				mode: ['simple'],
			},
		});
		expect(result).toBe(true);
	});

	it('handles expression values (starting with =) by returning true', () => {
		const context: DisplayOptionsContext = {
			parameters: { resource: '={{ $json.resource }}' },
		};
		// Expressions can't be statically evaluated, so we show the field
		const result = matchesDisplayOptions(context, {
			show: {
				resource: ['ticket'],
			},
		});
		expect(result).toBe(true);
	});

	it('combines show and hide conditions correctly', () => {
		const context: DisplayOptionsContext = {
			parameters: { resource: 'ticket', mode: 'simple' },
		};
		// Show if resource is ticket, but hide if mode is simple
		const result = matchesDisplayOptions(context, {
			show: { resource: ['ticket'] },
			hide: { mode: ['simple'] },
		});
		// Hide takes precedence when it matches
		expect(result).toBe(false);
	});

	it('works with @version meta-property', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
			nodeVersion: 3,
		};
		const result = matchesDisplayOptions(context, {
			show: {
				'@version': [{ _cnd: { gte: 2 } }],
			},
		});
		expect(result).toBe(true);
	});

	it('works with @tool meta-property when isToolNode is true', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
			isToolNode: true,
		};
		const result = matchesDisplayOptions(context, {
			show: {
				'@tool': [true],
			},
		});
		expect(result).toBe(true);
	});

	it('fails @tool: [true] condition when isToolNode is false', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
			isToolNode: false,
		};
		const result = matchesDisplayOptions(context, {
			show: {
				'@tool': [true],
			},
		});
		expect(result).toBe(false);
	});

	it('works with @tool: [false] when isToolNode is false', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
			isToolNode: false,
		};
		const result = matchesDisplayOptions(context, {
			show: {
				'@tool': [false],
			},
		});
		expect(result).toBe(true);
	});

	it('fails @tool: [true] when isToolNode is not specified (defaults to false)', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
		};
		const result = matchesDisplayOptions(context, {
			show: {
				'@tool': [true],
			},
		});
		expect(result).toBe(false);
	});

	it('works with root path references', () => {
		const context: DisplayOptionsContext = {
			parameters: { nested: { value: 'test' } },
			rootParameters: { globalSetting: 'enabled' },
		};
		const result = matchesDisplayOptions(context, {
			show: {
				'/globalSetting': ['enabled'],
			},
		});
		expect(result).toBe(true);
	});

	it('does not apply hide condition when actualValues is empty', () => {
		const context: DisplayOptionsContext = {
			parameters: {},
		};
		// When the property doesn't exist, hide conditions should not trigger
		const result = matchesDisplayOptions(context, {
			hide: {
				nonexistent: ['value'],
			},
		});
		expect(result).toBe(true);
	});

	describe('defaults handling', () => {
		it('uses default value for show condition when property is not set', () => {
			// This is the Webhook httpMethod use case:
			// displayOptions: {"show":{"multipleMethods":[false, true]}}
			// multipleMethods defaults to false, so condition should match
			const context: DisplayOptionsContext = {
				parameters: {}, // multipleMethods not explicitly set
				defaults: { multipleMethods: false },
			};
			const result = matchesDisplayOptions(context, {
				show: { multipleMethods: [false, true] },
			});
			expect(result).toBe(true);
		});

		it('returns false when default does not match show condition', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
				defaults: { mode: 'simple' },
			};
			const result = matchesDisplayOptions(context, {
				show: { mode: ['advanced'] },
			});
			expect(result).toBe(false);
		});

		it('prefers explicit parameter value over default for show condition', () => {
			const context: DisplayOptionsContext = {
				parameters: { mode: 'advanced' },
				defaults: { mode: 'simple' },
			};
			const result = matchesDisplayOptions(context, {
				show: { mode: ['advanced'] },
			});
			expect(result).toBe(true);
		});

		it('uses default value for hide condition when property is not set', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
				defaults: { mode: 'simple' },
			};
			const result = matchesDisplayOptions(context, {
				hide: { mode: ['simple'] },
			});
			expect(result).toBe(false);
		});

		it('does not hide when default does not match hide condition', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
				defaults: { mode: 'advanced' },
			};
			const result = matchesDisplayOptions(context, {
				hide: { mode: ['simple'] },
			});
			expect(result).toBe(true);
		});

		it('handles boolean default values correctly', () => {
			// Common case: property defaults to false, show when [false, true]
			const context: DisplayOptionsContext = {
				parameters: {},
				defaults: { enabled: false },
			};
			const result = matchesDisplayOptions(context, {
				show: { enabled: [false, true] },
			});
			expect(result).toBe(true);
		});

		it('handles boolean default values correctly - should not match when default is not in list', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
				defaults: { enabled: false },
			};
			const result = matchesDisplayOptions(context, {
				show: { enabled: [true] },
			});
			expect(result).toBe(false);
		});
	});

	describe('unselected resource locator handling in hide conditions', () => {
		it('skips hide condition when referenced property is an unselected resource locator', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					sheetName: { __rl: true, mode: 'list', value: '' },
					resource: 'sheet',
					operation: 'read',
				},
			};
			// filtersUI has hide: { sheetName: [''] } — should NOT hide
			// because sheetName is an unselected RL (empty value means "not configured yet")
			const result = matchesDisplayOptions(context, {
				show: { resource: ['sheet'], operation: ['read'] },
				hide: { sheetName: [''] },
			});
			expect(result).toBe(true);
		});

		it('skips hide condition for unselected resource locator in id mode', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					documentId: { __rl: true, mode: 'id', value: '' },
				},
			};
			const result = matchesDisplayOptions(context, {
				hide: { documentId: [''] },
			});
			expect(result).toBe(true);
		});

		it('still applies hide condition for non-empty resource locator', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					sheetName: { __rl: true, mode: 'list', value: 'Sheet1' },
				},
			};
			const result = matchesDisplayOptions(context, {
				hide: { sheetName: ['Sheet1'] },
			});
			expect(result).toBe(false);
		});

		it('still applies hide condition for non-RL properties with empty string', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					mode: '',
				},
			};
			const result = matchesDisplayOptions(context, {
				hide: { mode: [''] },
			});
			expect(result).toBe(false);
		});
	});

	describe('regex path handling', () => {
		it('matches if ANY path in regex pattern exists', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					guardrails: {
						jailbreak: { value: { threshold: 0.7 } },
					},
				},
			};
			const result = matchesDisplayOptions(context, {
				show: {
					'/guardrails.(jailbreak|nsfw|topicalAlignment|custom)': [{ _cnd: { exists: true } }],
				},
			});
			expect(result).toBe(true);
		});

		it('matches when second alternative in regex exists', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					guardrails: {
						nsfw: { value: { threshold: 0.8 } },
					},
				},
			};
			const result = matchesDisplayOptions(context, {
				show: {
					'/guardrails.(jailbreak|nsfw|topicalAlignment|custom)': [{ _cnd: { exists: true } }],
				},
			});
			expect(result).toBe(true);
		});

		it('returns false when no paths match regex pattern', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					guardrails: {
						pii: { value: { type: 'all' } },
						secretKeys: { value: { permissiveness: 'balanced' } },
					},
				},
			};
			const result = matchesDisplayOptions(context, {
				show: {
					'/guardrails.(jailbreak|nsfw|topicalAlignment|custom)': [{ _cnd: { exists: true } }],
				},
			});
			expect(result).toBe(false);
		});

		it('returns false when guardrails is empty', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					guardrails: {},
				},
			};
			const result = matchesDisplayOptions(context, {
				show: {
					'/guardrails.(jailbreak|nsfw|topicalAlignment|custom)': [{ _cnd: { exists: true } }],
				},
			});
			expect(result).toBe(false);
		});

		it('returns false when guardrails does not exist', () => {
			const context: DisplayOptionsContext = {
				parameters: {},
			};
			const result = matchesDisplayOptions(context, {
				show: {
					'/guardrails.(jailbreak|nsfw|topicalAlignment|custom)': [{ _cnd: { exists: true } }],
				},
			});
			expect(result).toBe(false);
		});

		it('matches multiple LLM guardrails', () => {
			const context: DisplayOptionsContext = {
				parameters: {
					guardrails: {
						jailbreak: { value: { threshold: 0.7 } },
						nsfw: { value: { threshold: 0.8 } },
						custom: { guardrail: [{ name: 'test' }] },
					},
				},
			};
			const result = matchesDisplayOptions(context, {
				show: {
					'/guardrails.(jailbreak|nsfw|topicalAlignment|custom)': [{ _cnd: { exists: true } }],
				},
			});
			expect(result).toBe(true);
		});
	});
});
