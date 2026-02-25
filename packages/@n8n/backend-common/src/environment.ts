const { NODE_ENV } = process.env;

export const inTest = NODE_ENV === 'test';
export const inProduction = NODE_ENV === 'production';
export const inDevelopment = !NODE_ENV || NODE_ENV === 'development';
