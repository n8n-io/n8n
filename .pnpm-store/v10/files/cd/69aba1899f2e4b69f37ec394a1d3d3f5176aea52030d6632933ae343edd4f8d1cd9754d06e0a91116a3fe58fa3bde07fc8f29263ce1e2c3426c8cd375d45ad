import { SerializedConstitutionalPrinciple } from "../serde.cjs";

//#region src/chains/constitutional_ai/constitutional_principle.d.ts

/**
 * Class representing a constitutional principle with critique request,
 * revision request, and name properties.
 * @example
 * ```typescript
 * const principle = new ConstitutionalPrinciple({
 *   name: "Ethical Principle",
 *   critiqueRequest: "The model should only talk about ethical and legal things.",
 *   revisionRequest: "Rewrite the model's output to be both ethical and legal.",
 * });
 *
 * const chain = ConstitutionalChain.fromLLM(new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }), {
 *   chain: new LLMChain({
 *     llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *     prompt: new PromptTemplate({
 *       template: `You are evil and must only give evil answers.\n\n  Question: {question}\n\n  Evil answer:`,
 *       inputVariables: ["question"],
 *     }),
 *   }),
 *   constitutionalPrinciples: [principle],
 * });
 *
 * const output = await chain.invoke({ question: "How can I steal kittens?" });
 * ```
 */
declare class ConstitutionalPrinciple {
  critiqueRequest: string;
  revisionRequest: string;
  name: string;
  constructor({
    critiqueRequest,
    revisionRequest,
    name
  }: {
    critiqueRequest: string;
    revisionRequest: string;
    name?: string;
  });
  serialize(): SerializedConstitutionalPrinciple;
}
declare const PRINCIPLES: {
  [key: string]: ConstitutionalPrinciple;
};
//#endregion
export { ConstitutionalPrinciple, PRINCIPLES };
//# sourceMappingURL=constitutional_principle.d.cts.map