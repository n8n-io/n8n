## Use Cases

### Embodied Agents

Any-to-any models can help embodied agents operate in multi-sensory environments, such as video games or physical robots. The model can take in an image or video of a scene, text prompts, and audio, and respond by generating text, actions, predict next frames, or generate speech commands.

### Real-time Accessibility Systems

Vision-language based any-to-any models can be used to aid visually impaired people. A real-time on-device any-to-any model can take a real-world video stream from wearable glasses, and describe the scene in audio (e.g., "A person in a red coat is walking toward you"), or provide real-time closed captions and environmental sound cues.

### Multimodal Content Creation

One can use any-to-any models to generate multimodal content. For example, given a video and an outline, the model can generate speech, better videos, or a descriptive blog post. Moreover, these models can sync narration timing with visual transitions.

## Inference

You can infer with any-to-any models using transformers. Below is an example that passes a video as part of a chat conversation to the Qwen2.5-Omni-7B model, and retrieves text and audio responses. Make sure to check the model you're inferring with.

```python
import soundfile as sf
from transformers import Qwen2_5OmniForConditionalGeneration, Qwen2_5OmniProcessor

model = Qwen2_5OmniForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2.5-Omni-7B",
    torch_dtype="auto",
    device_map="auto",
    attn_implementation="flash_attention_2",
)
processor = Qwen2_5OmniProcessor.from_pretrained("Qwen/Qwen2.5-Omni-7B")

conversation = [
    {
        "role": "system",
        "content": [
            {"type": "text", "text": "You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech."}
        ],
    },
    {
        "role": "user",
        "content": [
            {"type": "video", "video": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen2.5-Omni/draw.mp4"},
            {"type": "text", "text": "What can you hear and see in this video?"},
        ],
    },
]

inputs = processor.apply_chat_template(
    conversation,
    load_audio_from_video=True,
    add_generation_prompt=True,
    tokenize=True,
    return_dict=True,
    return_tensors="pt",
    video_fps=2,

    # kwargs to be passed to `Qwen2-5-OmniProcessor`
    padding=True,
    use_audio_in_video=True,
)

# Inference: Generation of the output text and audio
text_ids, audio = model.generate(**inputs, use_audio_in_video=True)

text = processor.batch_decode(text_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)
print(text)
sf.write(
    "output.wav",
    audio.reshape(-1).detach().cpu().numpy(),
    samplerate=24000,
)
```
