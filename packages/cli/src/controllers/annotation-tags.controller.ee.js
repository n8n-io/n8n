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
exports.AnnotationTagsController = void 0;
const decorators_1 = require('@n8n/decorators');
const annotation_tag_service_ee_1 = require('@/services/annotation-tag.service.ee');
let AnnotationTagsController = class AnnotationTagsController {
	constructor(annotationTagService) {
		this.annotationTagService = annotationTagService;
	}
	async getAll(req) {
		return await this.annotationTagService.getAll({
			withUsageCount: req.query.withUsageCount === 'true',
		});
	}
	async createTag(req) {
		const tag = this.annotationTagService.toEntity({ name: req.body.name });
		return await this.annotationTagService.save(tag);
	}
	async updateTag(req) {
		const newTag = this.annotationTagService.toEntity({
			id: req.params.id,
			name: req.body.name.trim(),
		});
		return await this.annotationTagService.save(newTag);
	}
	async deleteTag(req) {
		const { id } = req.params;
		await this.annotationTagService.delete(id);
		return true;
	}
};
exports.AnnotationTagsController = AnnotationTagsController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.GlobalScope)('annotationTag:list'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	AnnotationTagsController.prototype,
	'getAll',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.GlobalScope)('annotationTag:create'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	AnnotationTagsController.prototype,
	'createTag',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:id'),
		(0, decorators_1.GlobalScope)('annotationTag:update'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	AnnotationTagsController.prototype,
	'updateTag',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:id'),
		(0, decorators_1.GlobalScope)('annotationTag:delete'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	AnnotationTagsController.prototype,
	'deleteTag',
	null,
);
exports.AnnotationTagsController = AnnotationTagsController = __decorate(
	[
		(0, decorators_1.RestController)('/annotation-tags'),
		__metadata('design:paramtypes', [annotation_tag_service_ee_1.AnnotationTagService]),
	],
	AnnotationTagsController,
);
//# sourceMappingURL=annotation-tags.controller.ee.js.map
