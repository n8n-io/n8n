import {
	SnippetListRequestDto,
	CreateSnippetRequestDto,
	UpdateSnippetRequestDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { SnippetsService } from './snippets.service';
import { SnippetValidationError } from './errors/snippet-validation.error';

@RestController('/snippets')
export class SnippetsController {
	constructor(private readonly snippetsService: SnippetsService) {}

	@Get('/')
	async getSnippets(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: SnippetListRequestDto,
	) {
		return await this.snippetsService.getAllForUser(req.user, query);
	}

	@Get('/:id')
	async getSnippet(req: AuthenticatedRequest<{ id: string }>) {
		const snippet = await this.snippetsService.getForUser(req.user, req.params.id);
		if (snippet === null) {
			throw new NotFoundError(`Snippet with id ${req.params.id} not found`);
		}
		return snippet;
	}

	@Post('/')
	async createSnippet(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateSnippetRequestDto,
	) {
		try {
			return await this.snippetsService.create(req.user, payload);
		} catch (error) {
			if (error instanceof SnippetValidationError) throw new BadRequestError(error.message);
			throw error;
		}
	}

	@Patch('/:id')
	async updateSnippet(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
		@Body payload: UpdateSnippetRequestDto,
	) {
		try {
			return await this.snippetsService.update(req.user, req.params.id, payload);
		} catch (error) {
			if (error instanceof SnippetValidationError) throw new BadRequestError(error.message);
			throw error;
		}
	}

	@Delete('/:id')
	async deleteSnippet(req: AuthenticatedRequest<{ id: string }>) {
		await this.snippetsService.delete(req.user, req.params.id);
		return true;
	}
}
