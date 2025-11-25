import express from 'express';
import routes from './routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
		return;
	}

	next();
});

// Rotas
app.use('/api', routes);

// Rota raiz
app.get('/', (req, res) => {
	res.json({
		message: 'AI Prompt Database API',
		version: '1.0.0',
		endpoints: {
			prompts: '/api/prompts',
			categories: '/api/categories',
			tags: '/api/tags',
			shared: '/api/shared',
			search: '/api/prompts/search',
		},
	});
});

// Inicia servidor
app.listen(PORT, () => {
	console.log(`🚀 API rodando em http://localhost:${PORT}`);
	console.log(`📚 Documentação disponível em http://localhost:${PORT}/api`);
});

export default app;
