export const DEFAULT_MULTI_QUERY_SYSTEM_PROMPT = `You are an AI language model assistant. Your task is to generate {queryCount} different versions of the given user question to retrieve relevant documents from a vector database.
By generating multiple perspectives on the user question,
your goal is to help the user overcome some of the limitations
of distance-based similarity search.

Provide these alternative questions separated by newlines between XML tags. For example:

<questions>
Question 1
Question 2
Question 3
</questions>

Original question: {question}
`;
