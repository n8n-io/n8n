import express, { Request, Response, NextFunction } from 'express';
import {
	PromptService,
	CategoryService,
	SearchService,
	ShareService,
} from '../services/index.js';
import { CreatePromptData, UpdatePromptData, PromptSearchFilters } from '../models/index.js';
import { AppError } from '../models/Errors.js';

const router = express.Router();

// Inicializa serviços
const promptService = new PromptService();
const categoryService = new CategoryService();
const searchService = new SearchService();
const shareService = new ShareService();

/**
 * Middleware de tratamento de erros
 */
const asyncHandler =
	(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
	(req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};

// ===== ROTAS DE PROMPTS =====

/**
 * GET /api/prompts - Lista todos os prompts
 */
router.get(
	'/prompts',
	asyncHandler(async (req: Request, res: Response) => {
		const prompts = await promptService.listAllPrompts();
		res.json({ success: true, data: prompts });
	}),
);

/**
 * GET /api/prompts/:id - Obtém um prompt específico
 */
router.get(
	'/prompts/:id',
	asyncHandler(async (req: Request, res: Response) => {
		const prompt = await promptService.getPromptById(req.params.id);
		res.json({ success: true, data: prompt });
	}),
);

/**
 * POST /api/prompts - Cria um novo prompt
 */
router.post(
	'/prompts',
	asyncHandler(async (req: Request, res: Response) => {
		const data = req.body as CreatePromptData;
		const prompt = await promptService.createPrompt(data);
		res.status(201).json({ success: true, data: prompt });
	}),
);

/**
 * PUT /api/prompts/:id - Atualiza um prompt
 */
router.put(
	'/prompts/:id',
	asyncHandler(async (req: Request, res: Response) => {
		const data = req.body as UpdatePromptData;
		const updatedBy = req.body.updatedBy || 'api';
		const prompt = await promptService.updatePrompt(req.params.id, data, updatedBy);
		res.json({ success: true, data: prompt });
	}),
);

/**
 * DELETE /api/prompts/:id - Deleta um prompt
 */
router.delete(
	'/prompts/:id',
	asyncHandler(async (req: Request, res: Response) => {
		await promptService.deletePrompt(req.params.id);
		res.json({ success: true, message: 'Prompt deletado com sucesso' });
	}),
);

// ===== ROTAS DE VERSÕES =====

/**
 * GET /api/prompts/:id/versions - Lista versões de um prompt
 */
router.get(
	'/prompts/:id/versions',
	asyncHandler(async (req: Request, res: Response) => {
		const versions = await promptService.getPromptVersions(req.params.id);
		res.json({ success: true, data: versions });
	}),
);

/**
 * POST /api/prompts/:id/restore/:version - Restaura uma versão específica
 */
router.post(
	'/prompts/:id/restore/:version',
	asyncHandler(async (req: Request, res: Response) => {
		const restoredBy = req.body.restoredBy || 'api';
		const version = parseInt(req.params.version, 10);
		const prompt = await promptService.restoreVersion(req.params.id, version, restoredBy);
		res.json({ success: true, data: prompt });
	}),
);

// ===== ROTAS DE BUSCA =====

/**
 * POST /api/prompts/search - Busca prompts com filtros
 */
router.post(
	'/prompts/search',
	asyncHandler(async (req: Request, res: Response) => {
		const filters = req.body as PromptSearchFilters;
		const page = parseInt(req.query.page as string, 10) || 1;
		const pageSize = parseInt(req.query.pageSize as string, 10) || 10;
		const result = await searchService.searchPrompts(filters, page, pageSize);
		res.json({ success: true, data: result });
	}),
);

/**
 * GET /api/prompts/search/quick - Busca rápida
 */
router.get(
	'/prompts/search/quick',
	asyncHandler(async (req: Request, res: Response) => {
		const query = req.query.q as string;
		if (!query) {
			res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
			return;
		}
		const prompts = await searchService.quickSearch(query);
		res.json({ success: true, data: prompts });
	}),
);

/**
 * GET /api/prompts/:id/similar - Encontra prompts similares
 */
router.get(
	'/prompts/:id/similar',
	asyncHandler(async (req: Request, res: Response) => {
		const limit = parseInt(req.query.limit as string, 10) || 5;
		const prompts = await searchService.findSimilarPrompts(req.params.id, limit);
		res.json({ success: true, data: prompts });
	}),
);

/**
 * GET /api/prompts/search/recent - Lista prompts recentes
 */
router.get(
	'/prompts/search/recent',
	asyncHandler(async (req: Request, res: Response) => {
		const limit = parseInt(req.query.limit as string, 10) || 10;
		const prompts = await searchService.getRecentPrompts(limit);
		res.json({ success: true, data: prompts });
	}),
);

// ===== ROTAS DE CATEGORIAS E TAGS =====

/**
 * GET /api/categories - Lista todas as categorias
 */
router.get(
	'/categories',
	asyncHandler(async (req: Request, res: Response) => {
		const categories = await categoryService.listCategories();
		res.json({ success: true, data: categories });
	}),
);

/**
 * GET /api/categories/stats - Estatísticas de categorias
 */
router.get(
	'/categories/stats',
	asyncHandler(async (req: Request, res: Response) => {
		const stats = await categoryService.getCategoryStats();
		res.json({ success: true, data: stats });
	}),
);

/**
 * GET /api/categories/:category/prompts - Lista prompts por categoria
 */
router.get(
	'/categories/:category/prompts',
	asyncHandler(async (req: Request, res: Response) => {
		const prompts = await categoryService.getPromptsByCategory(req.params.category);
		res.json({ success: true, data: prompts });
	}),
);

/**
 * GET /api/tags - Lista todas as tags
 */
router.get(
	'/tags',
	asyncHandler(async (req: Request, res: Response) => {
		const tags = await categoryService.listTags();
		res.json({ success: true, data: tags });
	}),
);

/**
 * GET /api/tags/stats - Estatísticas de tags
 */
router.get(
	'/tags/stats',
	asyncHandler(async (req: Request, res: Response) => {
		const stats = await categoryService.getTagStats();
		res.json({ success: true, data: stats });
	}),
);

/**
 * GET /api/tags/:tag/prompts - Lista prompts por tag
 */
router.get(
	'/tags/:tag/prompts',
	asyncHandler(async (req: Request, res: Response) => {
		const prompts = await categoryService.getPromptsByTag(req.params.tag);
		res.json({ success: true, data: prompts });
	}),
);

// ===== ROTAS DE COMPARTILHAMENTO =====

/**
 * GET /api/shared - Lista prompts compartilhados
 */
router.get(
	'/shared',
	asyncHandler(async (req: Request, res: Response) => {
		const prompts = await shareService.listSharedPrompts();
		res.json({ success: true, data: prompts });
	}),
);

/**
 * POST /api/prompts/:id/share - Marca prompt como compartilhado
 */
router.post(
	'/prompts/:id/share',
	asyncHandler(async (req: Request, res: Response) => {
		const prompt = await shareService.sharePrompt(req.params.id);
		res.json({ success: true, data: prompt });
	}),
);

/**
 * POST /api/prompts/:id/unshare - Remove marca de compartilhado
 */
router.post(
	'/prompts/:id/unshare',
	asyncHandler(async (req: Request, res: Response) => {
		const prompt = await shareService.unsharePrompt(req.params.id);
		res.json({ success: true, data: prompt });
	}),
);

// ===== MIDDLEWARE DE ERRO =====

router.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
	if (error instanceof AppError) {
		res.status(error.statusCode).json({
			success: false,
			error: error.message,
			code: error.code,
		});
	} else {
		console.error('Erro inesperado:', error);
		res.status(500).json({
			success: false,
			error: 'Erro interno do servidor',
		});
	}
});

export default router;
