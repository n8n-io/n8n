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
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.TagsController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const tag_service_1 = require('@/services/tag.service');
let TagsController = class TagsController {
	constructor(tagService) {
		this.tagService = tagService;
	}
	async getAll(_req, _res, query) {
		return await this.tagService.getAll({ withUsageCount: query.withUsageCount });
	}
	async createTag(_req, _res, payload) {
		const { name } = payload;
		const tag = this.tagService.toEntity({ name });
		return await this.tagService.save(tag, 'create');
	}
	async updateTag(_req, _res, tagId, payload) {
		const newTag = this.tagService.toEntity({ id: tagId, name: payload.name });
		return await this.tagService.save(newTag, 'update');
	}
	async deleteTag(_req, _res, tagId) {
		await this.tagService.delete(tagId);
		return true;
	}
};
exports.TagsController = TagsController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.GlobalScope)('tag:list'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.RetrieveTagQueryDto]),
		__metadata('design:returntype', Promise),
	],
	TagsController.prototype,
	'getAll',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.GlobalScope)('tag:create'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.CreateOrUpdateTagRequestDto]),
		__metadata('design:returntype', Promise),
	],
	TagsController.prototype,
	'createTag',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:id'),
		(0, decorators_1.GlobalScope)('tag:update'),
		__param(2, (0, decorators_1.Param)('id')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			String,
			api_types_1.CreateOrUpdateTagRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	TagsController.prototype,
	'updateTag',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:id'),
		(0, decorators_1.GlobalScope)('tag:delete'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	TagsController.prototype,
	'deleteTag',
	null,
);
exports.TagsController = TagsController = __decorate(
	[
		(0, decorators_1.RestController)('/tags'),
		__metadata('design:paramtypes', [tag_service_1.TagService]),
	],
	TagsController,
);
//# sourceMappingURL=tags.controller.js.map
