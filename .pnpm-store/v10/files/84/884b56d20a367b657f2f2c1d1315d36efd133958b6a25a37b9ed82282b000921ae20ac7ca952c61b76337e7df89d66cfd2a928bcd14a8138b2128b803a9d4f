//#region src/utils/math.d.ts
type VectorFunction = (xVector: number[], yVector: number[]) => number;
/**
 * Apply a row-wise function between two matrices with the same number of columns.
 *
 * @param {number[][]} X - The first matrix.
 * @param {number[][]} Y - The second matrix.
 * @param {VectorFunction} func - The function to apply.
 *
 * @throws {Error} If the number of columns in X and Y are not the same.
 *
 * @returns {number[][] | [[]]} A matrix where each row represents the result of applying the function between the corresponding rows of X and Y.
 */
declare function matrixFunc(X: number[][], Y: number[][], func: VectorFunction): number[][];
declare function normalize(M: number[][], similarity?: boolean): number[][];
/**
 * This function calculates the row-wise cosine similarity between two matrices with the same number of columns.
 *
 * @param {number[][]} X - The first matrix.
 * @param {number[][]} Y - The second matrix.
 *
 * @throws {Error} If the number of columns in X and Y are not the same.
 *
 * @returns {number[][] | [[]]} A matrix where each row represents the cosine similarity values between the corresponding rows of X and Y.
 */
declare function cosineSimilarity(X: number[][], Y: number[][]): number[][];
declare function innerProduct(X: number[][], Y: number[][]): number[][];
declare function euclideanDistance(X: number[][], Y: number[][]): number[][];
/**
 * This function implements the Maximal Marginal Relevance algorithm
 * to select a set of embeddings that maximizes the diversity and relevance to a query embedding.
 *
 * @param {number[]|number[][]} queryEmbedding - The query embedding.
 * @param {number[][]} embeddingList - The list of embeddings to select from.
 * @param {number} [lambda=0.5] - The trade-off parameter between relevance and diversity.
 * @param {number} [k=4] - The maximum number of embeddings to select.
 *
 * @returns {number[]} The indexes of the selected embeddings in the embeddingList.
 */
declare function maximalMarginalRelevance(queryEmbedding: number[] | number[][], embeddingList: number[][], lambda?: number, k?: number): number[];
//#endregion
export { cosineSimilarity, euclideanDistance, innerProduct, matrixFunc, maximalMarginalRelevance, normalize };
//# sourceMappingURL=math.d.cts.map