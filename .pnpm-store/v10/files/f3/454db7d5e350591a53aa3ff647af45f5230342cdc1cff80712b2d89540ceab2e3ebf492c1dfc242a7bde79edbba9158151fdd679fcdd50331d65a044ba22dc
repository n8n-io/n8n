'use strict';

const PLUS_CODE = 43; // +
const MINUS_CODE = 45; // -

const plugin = {
	name: 'assignment',

	assignmentOperators: new Set([
		'=',
		'*=',
		'**=',
		'/=',
		'%=',
		'+=',
		'-=',
		'<<=',
		'>>=',
		'>>>=',
		'&=',
		'^=',
		'|=',
		'||=',
		'&&=',
		'??=',
	]),
	updateOperators: [PLUS_CODE, MINUS_CODE],
	assignmentPrecedence: 0.9,

	init(jsep) {
		const updateNodeTypes = [jsep.IDENTIFIER, jsep.MEMBER_EXP];
		plugin.assignmentOperators.forEach(op => jsep.addBinaryOp(op, plugin.assignmentPrecedence, true));

		jsep.hooks.add('gobble-token', function gobbleUpdatePrefix(env) {
			const code = this.code;
			if (plugin.updateOperators.some(c => c === code && c === this.expr.charCodeAt(this.index + 1))) {
				this.index += 2;
				env.node = {
					type: 'UpdateExpression',
					operator: code === PLUS_CODE ? '++' : '--',
					argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
					prefix: true,
				};
				if (!env.node.argument || !updateNodeTypes.includes(env.node.argument.type)) {
					this.throwError(`Unexpected ${env.node.operator}`);
				}
			}
		});

		jsep.hooks.add('after-token', function gobbleUpdatePostfix(env) {
			if (env.node) {
				const code = this.code;
				if (plugin.updateOperators.some(c => c === code && c === this.expr.charCodeAt(this.index + 1))) {
					if (!updateNodeTypes.includes(env.node.type)) {
						this.throwError(`Unexpected ${env.node.operator}`);
					}
					this.index += 2;
					env.node = {
						type: 'UpdateExpression',
						operator: code === PLUS_CODE ? '++' : '--',
						argument: env.node,
						prefix: false,
					};
				}
			}
		});

		jsep.hooks.add('after-expression', function gobbleAssignment(env) {
			if (env.node) {
				// Note: Binaries can be chained in a single expression to respect
				// operator precedence (i.e. a = b = 1 + 2 + 3)
				// Update all binary assignment nodes in the tree
				updateBinariesToAssignments(env.node);
			}
		});

		function updateBinariesToAssignments(node) {
			if (plugin.assignmentOperators.has(node.operator)) {
				node.type = 'AssignmentExpression';
				updateBinariesToAssignments(node.left);
				updateBinariesToAssignments(node.right);
			}
			else if (!node.operator) {
				Object.values(node).forEach((val) => {
					if (val && typeof val === 'object') {
						updateBinariesToAssignments(val);
					}
				});
			}
		}
	},
};

module.exports = plugin;
//# sourceMappingURL=index.cjs.js.map
