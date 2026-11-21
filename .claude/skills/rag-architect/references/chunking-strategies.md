# Chunking Strategies

---

## Strategy Comparison Matrix

| Strategy | Best For | Chunk Quality | Implementation Complexity |
|----------|----------|---------------|---------------------------|
| **Fixed-size** | Simple documents, logs | Low-Medium | Simple |
| **Recursive character** | General text, articles | Medium | Simple |
| **Sentence-based** | Conversational, Q&A | Medium-High | Medium |
| **Semantic** | Technical docs, manuals | High | Medium |
| **Document-aware** | Structured content (MD, HTML) | High | Medium |
| **Agentic/Contextual** | Complex documents | Very High | Complex |
| **Late chunking** | Long-context embeddings | High | Medium |

---

## When to Use Each Strategy

### Fixed-Size Chunking
```
Best For:
- Log files and structured data
- Quick prototyping
- When content has no natural structure
- Baseline comparison

When to Avoid:
- Technical documentation
- Content with semantic units (paragraphs, sections)
- When context preservation matters
```

### Recursive Character Splitting
```
Best For:
- General articles and blog posts
- Mixed content types
- Default starting point for most RAG
- LangChain/LlamaIndex default

When to Avoid:
- Highly structured documents
- Code-heavy content
- Tables and lists
```

### Semantic Chunking
```
Best For:
- Technical documentation
- Research papers
- Content with natural topic boundaries
- When retrieval precision is critical

When to Avoid:
- Real-time ingestion (slower)
- Very short documents
- Cost-sensitive pipelines (requires embeddings)
```

### Document-Aware Chunking
```
Best For:
- Markdown documentation
- HTML pages
- LaTeX papers
- Code files

When to Avoid:
- Plain text without structure
- Inconsistent formatting
```

---

## Fixed-Size Chunking

```python
def fixed_size_chunk(
    text: str,
    chunk_size: int = 500,
    overlap: int = 50
) -> list[str]:
    """Simple fixed-size chunking with overlap."""
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]

        # Try to break at word boundary
        if end < len(text):
            last_space = chunk.rfind(' ')
            if last_space > chunk_size * 0.8:  # Only if reasonably far in
                chunk = chunk[:last_space]
                end = start + last_space

        chunks.append(chunk.strip())
        start = end - overlap

    return chunks

# Usage
chunks = fixed_size_chunk(document_text, chunk_size=500, overlap=50)
```

---

## Recursive Character Splitting (LangChain Style)

```python
from typing import Callable

class RecursiveCharacterSplitter:
    """Split text recursively using multiple separators."""

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: list[str] | None = None,
        length_function: Callable[[str], int] = len
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]
        self.length_function = length_function

    def split_text(self, text: str) -> list[str]:
        """Split text into chunks."""
        return self._split_text(text, self.separators)

    def _split_text(self, text: str, separators: list[str]) -> list[str]:
        final_chunks = []
        separator = separators[-1]

        for i, sep in enumerate(separators):
            if sep == "":
                separator = sep
                break
            if sep in text:
                separator = sep
                break

        splits = text.split(separator) if separator else list(text)

        good_splits = []
        for split in splits:
            if self.length_function(split) < self.chunk_size:
                good_splits.append(split)
            else:
                if good_splits:
                    merged = self._merge_splits(good_splits, separator)
                    final_chunks.extend(merged)
                    good_splits = []
                # Recursively split large chunks
                other_chunks = self._split_text(split, separators[separators.index(separator) + 1:])
                final_chunks.extend(other_chunks)

        if good_splits:
            merged = self._merge_splits(good_splits, separator)
            final_chunks.extend(merged)

        return final_chunks

    def _merge_splits(self, splits: list[str], separator: str) -> list[str]:
        """Merge splits into chunks respecting size limits."""
        chunks = []
        current_chunk = []
        current_length = 0

        for split in splits:
            split_length = self.length_function(split)

            if current_length + split_length > self.chunk_size:
                if current_chunk:
                    chunks.append(separator.join(current_chunk))
                    # Keep overlap
                    while current_length > self.chunk_overlap and current_chunk:
                        current_length -= self.length_function(current_chunk[0])
                        current_chunk = current_chunk[1:]

            current_chunk.append(split)
            current_length += split_length

        if current_chunk:
            chunks.append(separator.join(current_chunk))

        return chunks

# Usage
splitter = RecursiveCharacterSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " "]
)
chunks = splitter.split_text(document_text)
```

### Token-Based Splitting

```python
import tiktoken

def create_token_splitter(
    model: str = "gpt-4",
    chunk_size: int = 500,
    chunk_overlap: int = 50
):
    """Create splitter that counts tokens instead of characters."""
    encoding = tiktoken.encoding_for_model(model)

    def token_length(text: str) -> int:
        return len(encoding.encode(text))

    return RecursiveCharacterSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=token_length
    )

# Usage
token_splitter = create_token_splitter(chunk_size=500, chunk_overlap=50)
chunks = token_splitter.split_text(document_text)
```

---

## Sentence-Based Chunking

```python
import re
from dataclasses import dataclass

@dataclass
class SentenceChunk:
    text: str
    sentences: list[str]
    start_sentence: int
    end_sentence: int

def sentence_chunk(
    text: str,
    sentences_per_chunk: int = 5,
    overlap_sentences: int = 1
) -> list[SentenceChunk]:
    """Chunk by sentence count with overlap."""
    # Split into sentences
    sentence_pattern = r'(?<=[.!?])\s+'
    sentences = re.split(sentence_pattern, text)
    sentences = [s.strip() for s in sentences if s.strip()]

    chunks = []
    i = 0

    while i < len(sentences):
        end = min(i + sentences_per_chunk, len(sentences))
        chunk_sentences = sentences[i:end]

        chunks.append(SentenceChunk(
            text=" ".join(chunk_sentences),
            sentences=chunk_sentences,
            start_sentence=i,
            end_sentence=end - 1
        ))

        i += sentences_per_chunk - overlap_sentences

    return chunks

# Better sentence splitting with NLTK
import nltk
nltk.download('punkt')
from nltk.tokenize import sent_tokenize

def sentence_chunk_nltk(
    text: str,
    max_chunk_size: int = 1000,
    overlap_sentences: int = 2
) -> list[str]:
    """Chunk by sentences up to max size."""
    sentences = sent_tokenize(text)
    chunks = []
    current_chunk = []
    current_size = 0

    for sentence in sentences:
        sentence_size = len(sentence)

        if current_size + sentence_size > max_chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            # Keep overlap sentences
            current_chunk = current_chunk[-overlap_sentences:] if overlap_sentences else []
            current_size = sum(len(s) for s in current_chunk)

        current_chunk.append(sentence)
        current_size += sentence_size

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks
```

---

## Semantic Chunking

```python
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

class SemanticChunker:
    """Chunk based on semantic similarity between sentences."""

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        similarity_threshold: float = 0.5,
        min_chunk_size: int = 100,
        max_chunk_size: int = 1500
    ):
        self.model = SentenceTransformer(model_name)
        self.similarity_threshold = similarity_threshold
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size

    def chunk(self, text: str) -> list[str]:
        """Split text at semantic boundaries."""
        # Split into sentences
        sentences = self._split_sentences(text)
        if len(sentences) <= 1:
            return [text]

        # Get embeddings
        embeddings = self.model.encode(sentences)

        # Find breakpoints based on similarity drops
        breakpoints = self._find_breakpoints(embeddings)

        # Create chunks
        chunks = []
        start = 0

        for bp in breakpoints:
            chunk_text = " ".join(sentences[start:bp])

            # Handle size constraints
            if len(chunk_text) > self.max_chunk_size:
                # Split large chunks
                sub_chunks = self._split_large_chunk(sentences[start:bp])
                chunks.extend(sub_chunks)
            elif len(chunk_text) >= self.min_chunk_size:
                chunks.append(chunk_text)
            elif chunks:
                # Merge small chunk with previous
                chunks[-1] += " " + chunk_text
            else:
                chunks.append(chunk_text)

            start = bp

        # Handle remaining sentences
        if start < len(sentences):
            remaining = " ".join(sentences[start:])
            if chunks and len(remaining) < self.min_chunk_size:
                chunks[-1] += " " + remaining
            else:
                chunks.append(remaining)

        return chunks

    def _split_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _find_breakpoints(self, embeddings: np.ndarray) -> list[int]:
        """Find semantic breakpoints using similarity drops."""
        breakpoints = []

        for i in range(1, len(embeddings)):
            similarity = cosine_similarity(
                embeddings[i-1:i],
                embeddings[i:i+1]
            )[0][0]

            if similarity < self.similarity_threshold:
                breakpoints.append(i)

        return breakpoints

    def _split_large_chunk(self, sentences: list[str]) -> list[str]:
        """Split oversized chunk at midpoint."""
        mid = len(sentences) // 2
        return [
            " ".join(sentences[:mid]),
            " ".join(sentences[mid:])
        ]

# Usage
chunker = SemanticChunker(
    similarity_threshold=0.5,
    min_chunk_size=200,
    max_chunk_size=1000
)
semantic_chunks = chunker.chunk(document_text)
```

### Percentile-Based Breakpoints

```python
def find_breakpoints_percentile(
    embeddings: np.ndarray,
    percentile: int = 25
) -> list[int]:
    """Find breakpoints at similarity drops below percentile threshold."""
    similarities = []

    for i in range(1, len(embeddings)):
        sim = cosine_similarity(
            embeddings[i-1:i],
            embeddings[i:i+1]
        )[0][0]
        similarities.append((i, sim))

    # Dynamic threshold based on distribution
    sim_values = [s[1] for s in similarities]
    threshold = np.percentile(sim_values, percentile)

    return [i for i, sim in similarities if sim < threshold]
```

---

## Document-Aware Chunking

### Markdown Chunking

```python
import re
from dataclasses import dataclass

@dataclass
class MarkdownChunk:
    text: str
    heading: str | None
    heading_level: int
    metadata: dict

def chunk_markdown(
    text: str,
    max_chunk_size: int = 1500,
    include_heading_in_chunk: bool = True
) -> list[MarkdownChunk]:
    """Chunk markdown by headers while respecting structure."""
    # Pattern to match headers
    header_pattern = r'^(#{1,6})\s+(.+)$'

    lines = text.split('\n')
    chunks = []
    current_chunk_lines = []
    current_heading = None
    current_level = 0
    heading_stack = []  # For breadcrumb context

    for line in lines:
        header_match = re.match(header_pattern, line)

        if header_match:
            # Save current chunk if exists
            if current_chunk_lines:
                chunk_text = '\n'.join(current_chunk_lines)
                if len(chunk_text.strip()) > 0:
                    prefix = f"# {current_heading}\n\n" if include_heading_in_chunk and current_heading else ""
                    chunks.append(MarkdownChunk(
                        text=prefix + chunk_text,
                        heading=current_heading,
                        heading_level=current_level,
                        metadata={"breadcrumb": " > ".join(heading_stack)}
                    ))

            # Update heading context
            level = len(header_match.group(1))
            heading = header_match.group(2).strip()

            # Maintain heading stack for breadcrumbs
            while heading_stack and current_level >= level:
                heading_stack.pop()
                current_level -= 1

            heading_stack.append(heading)
            current_heading = heading
            current_level = level
            current_chunk_lines = []

        else:
            current_chunk_lines.append(line)

            # Check chunk size
            current_text = '\n'.join(current_chunk_lines)
            if len(current_text) > max_chunk_size:
                # Split at paragraph boundary
                paragraphs = current_text.split('\n\n')
                if len(paragraphs) > 1:
                    split_point = len('\n\n'.join(paragraphs[:-1]))
                    chunk_text = current_text[:split_point]
                    prefix = f"# {current_heading}\n\n" if include_heading_in_chunk and current_heading else ""
                    chunks.append(MarkdownChunk(
                        text=prefix + chunk_text,
                        heading=current_heading,
                        heading_level=current_level,
                        metadata={"breadcrumb": " > ".join(heading_stack)}
                    ))
                    current_chunk_lines = [current_text[split_point:].strip()]

    # Don't forget the last chunk
    if current_chunk_lines:
        chunk_text = '\n'.join(current_chunk_lines)
        if len(chunk_text.strip()) > 0:
            prefix = f"# {current_heading}\n\n" if include_heading_in_chunk and current_heading else ""
            chunks.append(MarkdownChunk(
                text=prefix + chunk_text,
                heading=current_heading,
                heading_level=current_level,
                metadata={"breadcrumb": " > ".join(heading_stack)}
            ))

    return chunks
```

### Code-Aware Chunking

```python
import re
from dataclasses import dataclass

@dataclass
class CodeChunk:
    text: str
    language: str | None
    chunk_type: str  # "code", "text", "mixed"

def chunk_with_code_blocks(
    text: str,
    max_chunk_size: int = 1500
) -> list[CodeChunk]:
    """Chunk text while keeping code blocks intact."""
    # Pattern to match code blocks
    code_block_pattern = r'```(\w+)?\n(.*?)```'

    chunks = []
    last_end = 0

    for match in re.finditer(code_block_pattern, text, re.DOTALL):
        # Text before code block
        text_before = text[last_end:match.start()].strip()
        if text_before:
            # Chunk the text portion
            text_chunks = recursive_chunk(text_before, max_chunk_size)
            chunks.extend([
                CodeChunk(text=t, language=None, chunk_type="text")
                for t in text_chunks
            ])

        # Code block (keep intact if possible)
        language = match.group(1)
        code_content = match.group(2)
        full_block = match.group(0)

        if len(full_block) <= max_chunk_size:
            chunks.append(CodeChunk(
                text=full_block,
                language=language,
                chunk_type="code"
            ))
        else:
            # Split large code blocks by function/class
            code_chunks = split_code_block(code_content, language, max_chunk_size)
            chunks.extend(code_chunks)

        last_end = match.end()

    # Remaining text after last code block
    remaining = text[last_end:].strip()
    if remaining:
        text_chunks = recursive_chunk(remaining, max_chunk_size)
        chunks.extend([
            CodeChunk(text=t, language=None, chunk_type="text")
            for t in text_chunks
        ])

    return chunks

def split_code_block(code: str, language: str, max_size: int) -> list[CodeChunk]:
    """Split code block at logical boundaries."""
    # Simple function/class boundary splitting for Python
    if language == "python":
        pattern = r'\n(?=def |class |async def )'
    elif language in ["javascript", "typescript"]:
        pattern = r'\n(?=function |class |const |export )'
    else:
        pattern = r'\n\n'

    parts = re.split(pattern, code)
    chunks = []
    current = ""

    for part in parts:
        if len(current) + len(part) > max_size and current:
            chunks.append(CodeChunk(
                text=f"```{language}\n{current}```",
                language=language,
                chunk_type="code"
            ))
            current = part
        else:
            current += part

    if current:
        chunks.append(CodeChunk(
            text=f"```{language}\n{current}```",
            language=language,
            chunk_type="code"
        ))

    return chunks
```

---

## Contextual/Agentic Chunking

```python
from openai import OpenAI

def contextual_chunk(
    document: str,
    max_chunk_size: int = 1500
) -> list[dict]:
    """Use LLM to add context to each chunk."""
    # First, do structural chunking
    base_chunks = recursive_chunk(document, max_chunk_size)

    client = OpenAI()
    contextualized_chunks = []

    for chunk in base_chunks:
        # Generate contextual summary
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """Provide a brief context for this document chunk.
                    Include: what topic it covers, how it relates to the broader document,
                    and key concepts mentioned. Keep it under 100 words."""
                },
                {
                    "role": "user",
                    "content": f"Document excerpt:\n\n{chunk}"
                }
            ],
            max_tokens=150
        )

        context = response.choices[0].message.content

        contextualized_chunks.append({
            "text": chunk,
            "context": context,
            "text_with_context": f"Context: {context}\n\nContent: {chunk}"
        })

    return contextualized_chunks
```

### Propositions-Based Chunking

```python
def extract_propositions(text: str) -> list[str]:
    """Extract atomic propositions from text using LLM."""
    client = OpenAI()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """Extract atomic propositions from the text.
                Each proposition should:
                - Be a single, complete fact
                - Be self-contained (understandable without context)
                - Include necessary entity references

                Return as a JSON array of strings."""
            },
            {
                "role": "user",
                "content": text
            }
        ],
        response_format={"type": "json_object"}
    )

    import json
    result = json.loads(response.choices[0].message.content)
    return result.get("propositions", [])

# Usage: For very fine-grained retrieval
propositions = extract_propositions(document_text)
# Each proposition becomes its own retrievable unit
```

---

## Late Chunking (for Long-Context Embeddings)

```python
from transformers import AutoTokenizer, AutoModel
import torch

class LateChunker:
    """
    Late chunking: embed full document, then pool token embeddings into chunks.
    Preserves full document context while creating retrievable chunks.
    """

    def __init__(self, model_name: str = "jinaai/jina-embeddings-v2-base-en"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name, trust_remote_code=True)
        self.model.eval()

    def chunk_and_embed(
        self,
        text: str,
        chunk_size: int = 512,
        overlap: int = 64
    ) -> list[dict]:
        """
        Embed full document, then create chunk embeddings via mean pooling.
        """
        # Tokenize full document
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=8192  # Model's max context
        )

        # Get token-level embeddings
        with torch.no_grad():
            outputs = self.model(**inputs)
            token_embeddings = outputs.last_hidden_state[0]  # [seq_len, hidden_dim]

        # Get token-to-text mapping
        tokens = self.tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])

        # Create chunks from token embeddings
        chunks = []
        seq_len = token_embeddings.shape[0]
        start = 0

        while start < seq_len:
            end = min(start + chunk_size, seq_len)

            # Mean pool token embeddings for this chunk
            chunk_embedding = token_embeddings[start:end].mean(dim=0).numpy()

            # Reconstruct text for this chunk
            chunk_token_ids = inputs["input_ids"][0][start:end]
            chunk_text = self.tokenizer.decode(chunk_token_ids, skip_special_tokens=True)

            chunks.append({
                "text": chunk_text,
                "embedding": chunk_embedding,
                "start_token": start,
                "end_token": end
            })

            start = end - overlap

        return chunks

# Usage
late_chunker = LateChunker()
chunks_with_embeddings = late_chunker.chunk_and_embed(
    long_document,
    chunk_size=512,
    overlap=64
)
```

---

## Metadata Enrichment

```python
from dataclasses import dataclass
from datetime import datetime
import hashlib

@dataclass
class EnrichedChunk:
    text: str
    embedding: list[float] | None
    metadata: dict

def enrich_chunk(
    text: str,
    source_file: str,
    chunk_index: int,
    total_chunks: int,
    additional_metadata: dict | None = None
) -> EnrichedChunk:
    """Add comprehensive metadata to chunk."""
    metadata = {
        # Source tracking
        "source": source_file,
        "chunk_index": chunk_index,
        "total_chunks": total_chunks,

        # Content characteristics
        "char_count": len(text),
        "word_count": len(text.split()),
        "content_hash": hashlib.md5(text.encode()).hexdigest()[:12],

        # Temporal
        "indexed_at": datetime.utcnow().isoformat(),

        # Position context
        "position": "start" if chunk_index == 0 else (
            "end" if chunk_index == total_chunks - 1 else "middle"
        )
    }

    if additional_metadata:
        metadata.update(additional_metadata)

    return EnrichedChunk(text=text, embedding=None, metadata=metadata)
```

---

## Chunk Size Selection Guide

| Document Type | Recommended Size | Overlap | Rationale |
|--------------|------------------|---------|-----------|
| FAQ/Q&A | 200-400 tokens | 20-50 | Keep Q&A pairs together |
| Technical docs | 400-600 tokens | 50-100 | Balance context vs precision |
| Legal/contracts | 600-800 tokens | 100-150 | Preserve clause context |
| Code documentation | 300-500 tokens | 50-100 | Keep function docs together |
| Chat transcripts | 150-300 tokens | 25-50 | Natural turn boundaries |
| Research papers | 500-800 tokens | 100-200 | Section-level coherence |

---

## Quick Reference

| Strategy | Use Case | Code Pattern |
|----------|----------|--------------|
| Fixed-size | Logs, baseline | `text[i:i+chunk_size]` |
| Recursive | General text | Split by `["\n\n", "\n", ". "]` |
| Sentence | Q&A content | `sent_tokenize()` + merge |
| Semantic | Technical docs | Similarity-based breaks |
| Markdown | Documentation | Header-aware splitting |
| Late chunking | Long-context models | Embed full, pool chunks |

## Related Skills

- **RAG Architect** - Integration with vector databases
- **Python Pro** - Preprocessing pipelines
- **NLP Engineer** - Tokenization and text processing
