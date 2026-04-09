---
title: Sequential Generations
description: Learn how to implement sequential generations ("chains") with the AI SDK
---

# Sequential Generations

When working with the AI SDK, you may want to create sequences of generations (often referred to as "chains" or "pipes"), where the output of one becomes the input for the next. This can be useful for creating more complex AI-powered workflows or for breaking down larger tasks into smaller, more manageable steps.

## Example

In a sequential chain, the output of one generation is directly used as input for the next generation. This allows you to create a series of dependent generations, where each step builds upon the previous one.

Here's an example of how you can implement sequential actions:

```typescript
import { generateText } from 'ai';
__PROVIDER_IMPORT__;

async function sequentialActions() {
  // Generate blog post ideas
  const ideasGeneration = await generateText({
    model: __MODEL__,
    prompt: 'Generate 10 ideas for a blog post about making spaghetti.',
  });

  console.log('Generated Ideas:\n', ideasGeneration);

  // Pick the best idea
  const bestIdeaGeneration = await generateText({
    model: __MODEL__,
    prompt: `Here are some blog post ideas about making spaghetti:
${ideasGeneration}

Pick the best idea from the list above and explain why it's the best.`,
  });

  console.log('\nBest Idea:\n', bestIdeaGeneration);

  // Generate an outline
  const outlineGeneration = await generateText({
    model: __MODEL__,
    prompt: `We've chosen the following blog post idea about making spaghetti:
${bestIdeaGeneration}

Create a detailed outline for a blog post based on this idea.`,
  });

  console.log('\nBlog Post Outline:\n', outlineGeneration);
}

sequentialActions().catch(console.error);
```

In this example, we first generate ideas for a blog post, then pick the best idea, and finally create an outline based on that idea. Each step uses the output from the previous step as input for the next generation.
