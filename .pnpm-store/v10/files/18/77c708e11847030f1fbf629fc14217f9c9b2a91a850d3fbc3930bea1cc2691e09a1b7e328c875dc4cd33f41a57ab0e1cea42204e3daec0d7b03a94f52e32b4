---
title: Prompt Engineering
description: Learn how to engineer prompts for LLMs with the AI SDK
---

# Prompt Engineering

## What is a Large Language Model (LLM)?

A Large Language Model is essentially a prediction engine that takes a sequence of words as input and aims to predict the most likely sequence to follow. It does this by assigning probabilities to potential next sequences and then selecting one. The model continues to generate sequences until it meets a specified stopping criterion.

These models learn by training on massive text corpuses, which means they will be better suited to some use cases than others. For example, a model trained on GitHub data would understand the probabilities of sequences in source code particularly well. However, it's crucial to understand that the generated sequences, while often seeming plausible, can sometimes be random and not grounded in reality. As these models become more accurate, many surprising abilities and applications emerge.

## What is a prompt?

Prompts are the starting points for LLMs. They are the inputs that trigger the model to generate text. The scope of prompt engineering involves not just crafting these prompts but also understanding related concepts such as hidden prompts, tokens, token limits, and the potential for prompt hacking, which includes phenomena like jailbreaks and leaks.

## Why is prompt engineering needed?

Prompt engineering currently plays a pivotal role in shaping the responses of LLMs. It allows us to tweak the model to respond more effectively to a broader range of queries. This includes the use of techniques like semantic search, command grammars, and the ReActive model architecture. The performance, context window, and cost of LLMs varies between models and model providers which adds further constraints to the mix. For example, the GPT-4 model is more expensive than GPT-3.5-turbo and significantly slower, but it can also be more effective at certain tasks. And so, like many things in software engineering, there is a trade-offs between cost and performance.

To assist with comparing and tweaking LLMs, we've built an AI playground that allows you to compare the performance of different models side-by-side online. When you're ready, you can even generate code with the AI SDK to quickly use your prompt and your selected model into your own applications.

## Example: Build a Slogan Generator

### Start with an instruction

Imagine you want to build a slogan generator for marketing campaigns. Creating catchy slogans isn't always straightforward!

First, you'll need a prompt that makes it clear what you want. Let's start with an instruction. Submit this prompt to generate your first completion.

<InlinePrompt initialInput="Create a slogan for a coffee shop." />

Not bad! Now, try making your instruction more specific.

<InlinePrompt initialInput="Create a slogan for an organic coffee shop." />

Introducing a single descriptive term to our prompt influences the completion. Essentially, crafting your prompt is the means by which you "instruct" or "program" the model.

### Include examples

Clear instructions are key for quality outcomes, but that might not always be enough. Let's try to enhance your instruction further.

<InlinePrompt initialInput="Create three slogans for a coffee shop with live music." />

These slogans are fine, but could be even better. It appears the model overlooked the 'live' part in our prompt. Let's change it slightly to generate more appropriate suggestions.

Often, it's beneficial to both demonstrate and tell the model your requirements. Incorporating examples in your prompt can aid in conveying patterns or subtleties. Test this prompt that carries a few examples.

<InlinePrompt
  initialInput={`Create three slogans for a business with unique features.

Business: Bookstore with cats
Slogans: "Purr-fect Pages", "Books and Whiskers", "Novels and Nuzzles"
Business: Gym with rock climbing
Slogans: "Peak Performance", "Reach New Heights", "Climb Your Way Fit"
Business: Coffee shop with live music
Slogans:`}
/>

Great! Incorporating examples of expected output for a certain input prompted the model to generate the kind of names we aimed for.

### Tweak your settings

Apart from designing prompts, you can influence completions by tweaking model settings. A crucial setting is the **temperature**.

You might have seen that the same prompt, when repeated, yielded the same or nearly the same completions. This happens when your temperature is at 0.

Attempt to re-submit the identical prompt a few times with temperature set to 1.

<InlinePrompt
  initialInput={`Create three slogans for a business with unique features.

Business: Bookstore with cats
Slogans: "Purr-fect Pages", "Books and Whiskers", "Novels and Nuzzles"
Business: Gym with rock climbing
Slogans: "Peak Performance", "Reach New Heights", "Climb Your Way Fit"
Business: Coffee shop with live music
Slogans:`}
showTemp={true}
initialTemperature={1}
/>

Notice the difference? With a temperature above 0, the same prompt delivers varied completions each time.

Keep in mind that the model forecasts the text most likely to follow the preceding text. Temperature, a value from 0 to 1, essentially governs the model's confidence level in making these predictions. A lower temperature implies lesser risks, leading to more precise and deterministic completions. A higher temperature yields a broader range of completions.

For your slogan generator, you might want a large pool of name suggestions. A moderate temperature of 0.6 should serve well.

## Recommended Resources

Prompt Engineering is evolving rapidly, with new methods and research papers surfacing every week. Here are some resources that we've found useful for learning about and experimenting with prompt engineering:

- [The Vercel AI Playground](/playground)
- [Brex Prompt Engineering](https://github.com/brexhq/prompt-engineering)
- [Prompt Engineering Guide by Dair AI](https://www.promptingguide.ai/)
