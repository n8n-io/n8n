'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.TagService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const external_hooks_1 = require('@/external-hooks');
const generic_helpers_1 = require('@/generic-helpers');
let TagService = class TagService {
	constructor(externalHooks, tagRepository) {
		this.externalHooks = externalHooks;
		this.tagRepository = tagRepository;
	}
	toEntity(attrs) {
		attrs.name = attrs.name.trim();
		return this.tagRepository.create(attrs);
	}
	async save(tag, actionKind) {
		await (0, generic_helpers_1.validateEntity)(tag);
		const action = actionKind[0].toUpperCase() + actionKind.slice(1);
		await this.externalHooks.run(`tag.before${action}`, [tag]);
		const savedTag = this.tagRepository.save(tag, { transaction: false });
		await this.externalHooks.run(`tag.after${action}`, [tag]);
		return await savedTag;
	}
	async delete(id) {
		await this.externalHooks.run('tag.beforeDelete', [id]);
		const deleteResult = this.tagRepository.delete(id);
		await this.externalHooks.run('tag.afterDelete', [id]);
		return await deleteResult;
	}
	async getAll(options) {
		if (options?.withUsageCount) {
			const tags = await this.tagRepository
				.createQueryBuilder('tag')
				.select(['tag.id', 'tag.name', 'tag.createdAt', 'tag.updatedAt'])
				.loadRelationCountAndMap('tag.usageCount', 'tag.workflowMappings', 'wm', (qb) =>
					qb.leftJoin('wm.workflows', 'workflow').where('workflow.isArchived = :isArchived', {
						isArchived: false,
					}),
				)
				.getMany();
			return tags;
		}
		return await this.tagRepository.find({
			select: ['id', 'name', 'createdAt', 'updatedAt'],
		});
	}
	async getById(id) {
		return await this.tagRepository.findOneOrFail({
			where: { id },
		});
	}
	sortByRequestOrder(tags, { requestOrder }) {
		const tagMap = tags.reduce((acc, tag) => {
			acc[tag.id] = tag;
			return acc;
		}, {});
		return requestOrder.map((tagId) => tagMap[tagId]);
	}
};
exports.TagService = TagService;
exports.TagService = TagService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [external_hooks_1.ExternalHooks, db_1.TagRepository]),
	],
	TagService,
);
//# sourceMappingURL=tag.service.js.map
