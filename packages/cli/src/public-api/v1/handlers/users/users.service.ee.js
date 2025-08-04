'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.getUser = getUser;
exports.getAllUsersAndCount = getAllUsersAndCount;
exports.clean = clean;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const pick_1 = __importDefault(require('lodash/pick'));
const uuid_1 = require('uuid');
async function getUser(data) {
	return await di_1.Container.get(db_1.UserRepository)
		.findOne({
			where: {
				...((0, uuid_1.validate)(data.withIdentifier) && { id: data.withIdentifier }),
				...(!(0, uuid_1.validate)(data.withIdentifier) && { email: data.withIdentifier }),
			},
		})
		.then((user) => {
			if (user && !data?.includeRole) delete user.role;
			return user;
		});
}
async function getAllUsersAndCount(data) {
	const { in: _in } = data;
	const users = await di_1.Container.get(db_1.UserRepository).find({
		where: { ...(_in && { id: (0, typeorm_1.In)(_in) }) },
		skip: data.offset,
		take: data.limit,
	});
	if (!data?.includeRole) {
		users.forEach((user) => {
			delete user.role;
		});
	}
	const count = await di_1.Container.get(db_1.UserRepository).count();
	return [users, count];
}
const userProperties = [
	'id',
	'email',
	'firstName',
	'lastName',
	'createdAt',
	'updatedAt',
	'isPending',
];
function pickUserSelectableProperties(user, options) {
	return (0, pick_1.default)(user, userProperties.concat(options?.includeRole ? ['role'] : []));
}
function clean(users, options) {
	return Array.isArray(users)
		? users.map((user) => pickUserSelectableProperties(user, options))
		: pickUserSelectableProperties(users, options);
}
//# sourceMappingURL=users.service.ee.js.map
