// Exporta todos os módulos principais para uso como biblioteca
export * from './models/index.js';
export * from './storage/index.js';
export * from './services/index.js';

// Exporta uma função para iniciar a API
export { default as startAPI } from './api/index.js';
