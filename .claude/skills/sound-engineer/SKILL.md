---
name: sound-engineer
description: Expert in spatial audio, procedural sound design, game audio middleware, and app UX sound design. Specializes in HRTF/Ambisonics, Wwise/FMOD integration, UI sound design, and adaptive music
  systems. Activate on 'spatial audio', 'HRTF', 'binaural', 'Wwise', 'FMOD', 'procedural sound', 'footstep system', 'adaptive music', 'UI sounds', 'notification audio', 'sonic branding'. NOT for music composition/production
  (use DAW), audio post-production for film (linear media), voice cloning/TTS (use voice-audio-engineer), podcast editing (use standard audio editors), or hardware design.
allowed-tools: Read,Write,Edit,Bash(python:*,node:*,npm:*,ffmpeg:*),mcp__firecrawl__firecrawl_search,WebFetch,mcp__ElevenLabs__text_to_sound_effects
metadata:
  category: Design & Creative
  pairs-with:
  - skill: voice-audio-engineer
    reason: Voice + spatial audio integration
  - skill: 2000s-visualization-expert
    reason: Audio-reactive visuals
  tags:
  - audio
  - spatial
  - wwise
  - fmod
  - game-audio
---

# Sound Engineer: Spatial Audio, Procedural Sound & App UX Audio

Expert audio engineer for interactive media: games, VR/AR, and mobile apps. Specializes in spatial audio, procedural sound generation, middleware integration, and UX sound design.

## When to Use This Skill

✅ **Use for:**
- Spatial audio (HRTF, binaural, Ambisonics)
- Procedural sound (footsteps, wind, environmental)
- Game audio middleware (Wwise, FMOD)
- Adaptive/interactive music systems
- UI/UX sound design (clicks, notifications, feedback)
- Sonic branding (audio logos, brand sounds)
- iOS/Android audio session handling
- Haptic-audio coordination
- Real-time DSP (reverb, EQ, compression)

❌ **Do NOT use for:**
- Music composition/production → DAW tools (Logic, Ableton)
- Voice synthesis/cloning → **voice-audio-engineer**
- Film audio post-production → linear editing workflows
- Podcast editing → standard audio editors
- Hardware microphone setup → specialized domain

## MCP Integrations

| MCP | Purpose |
|-----|---------|
| **ElevenLabs** | `text_to_sound_effects` - Generate UI sounds, notifications, impacts |
| **Firecrawl** | Research Wwise/FMOD docs, DSP algorithms, platform guidelines |
| **WebFetch** | Fetch Apple/Android audio session documentation |

## Expert vs Novice Shibboleths

| Topic | Novice | Expert |
|-------|--------|--------|
| **Spatial audio** | "Just pan left/right" | Uses HRTF convolution for true 3D; knows Ambisonics for VR head tracking |
| **Footsteps** | "Use 10-20 samples" | Procedural synthesis: infinite variation, tiny memory, parameter-driven |
| **Middleware** | "Just play sounds" | Uses RTPC for continuous params, Switches for materials, States for music |
| **Adaptive music** | "Crossfade tracks" | Horizontal re-orchestration (layers) + vertical remixing (stems) |
| **UI sounds** | "Any click sound works" | Designs for brand consistency, accessibility, haptic coordination |
| **iOS audio** | "AVAudioPlayer works" | Knows AVAudioSession categories, interruption handling, route changes |
| **Distance rolloff** | Linear attenuation | Inverse square with reference distance; logarithmic for realism |
| **CPU budget** | "Audio is cheap" | Knows 5-10% budget; HRTF convolution is expensive (2ms/source) |

## Common Anti-Patterns

### Anti-Pattern: Sample-Based Footsteps at Scale
**What it looks like**: 20 footstep samples × 6 surfaces × 3 intensities = 360 files (180MB)
**Why it's wrong**: Memory bloat, repetition audible after 20 minutes of play
**What to do instead**: Procedural synthesis - impact + texture layers, infinite variation from parameters
**When samples OK**: Small games, very specific character sounds

### Anti-Pattern: HRTF for Every Sound
**What it looks like**: Full HRTF convolution on 50 simultaneous sources
**Why it's wrong**: 50 × 2ms = 100ms CPU time; destroys frame budget
**What to do instead**: HRTF for 3-5 important sources; Ambisonics for ambient bed; simple panning for distant/unimportant

### Anti-Pattern: Ignoring Audio Sessions (Mobile)
**What it looks like**: App audio stops when user gets a phone call, never resumes
**Why it's wrong**: iOS/Android require explicit session management
**What to do instead**: Implement `AVAudioSession` (iOS) or `AudioFocus` (Android); handle interruptions, route changes

### Anti-Pattern: Hard-Coded Sounds
**What it looks like**: `PlaySound("footstep_concrete_01.wav")`
**Why it's wrong**: No variation, no parameter control, can't adapt to context
**What to do instead**: Use middleware events with Switches/RTPCs; procedural generation for environmental sounds

### Anti-Pattern: Loud UI Sounds
**What it looks like**: Every button click at -3dB, same volume as gameplay audio
**Why it's wrong**: UI sounds should be subtle, never fatiguing; violates platform guidelines
**What to do instead**: UI sounds at -18 to -24dB; use short, high-frequency transients; respect system volume

## Evolution Timeline

### Pre-2010: Fixed Audio
- Sample playback only
- Basic stereo panning
- Limited real-time processing

### 2010-2015: Middleware Era
- Wwise/FMOD become standard
- RTPC and State systems mature
- Basic HRTF support

### 2016-2020: VR Audio Revolution
- Ambisonics for VR head tracking
- Spatial audio APIs (Resonance, Steam Audio)
- Procedural audio gains traction

### 2021-2024: AI & Mobile
- ElevenLabs/AI sound effect generation
- Apple Spatial Audio for AirPods
- Procedural audio standard for AAA
- Haptic-audio design becomes discipline

### 2025+: Current Best Practices
- AI-assisted sound design
- Neural audio codecs
- Real-time voice transformation
- Personalized HRTF from photos

## Core Concepts

### Spatial Audio Approaches

| Approach | CPU Cost | Quality | Use Case |
|----------|----------|---------|----------|
| **Stereo panning** | ~0.01ms | Basic | Distant sounds, many sources |
| **HRTF convolution** | ~2ms/source | Excellent | Close/important 3D sounds |
| **Ambisonics** | ~1ms total | Good | VR, many sources, head tracking |
| **Binaural (simple)** | ~0.1ms/source | Decent | Budget/mobile spatial |

**HRTF**: Convolves audio with measured ear impulse responses (512-1024 taps). Creates convincing 3D positioning including elevation.

**Ambisonics**: Encodes sound field as spherical harmonics (W,X,Y,Z for 1st order). Rotation-invariant, efficient for many sources.

```cpp
// Key insight: encode once, rotate cheaply
AmbisonicSignal encode(mono_input, direction) {
    return {
        mono * 0.707f,      // W (omnidirectional)
        mono * direction.x, // X (front-back)
        mono * direction.y, // Y (left-right)
        mono * direction.z  // Z (up-down)
    };
}
```

### Procedural Footsteps

**Why procedural beats samples:**
- ✅ Infinite variation (no repetition)
- ✅ Tiny memory (~50KB vs 5-10MB)
- ✅ Parameter-driven (speed → impact force)
- ✅ Surface-aware from physics materials

**Core synthesis:**
1. Impact burst (20ms noise + resonant tone)
2. Surface texture (gravel = granular, grass = filtered noise)
3. Debris (scattered micro-impacts)
4. Surface EQ (metal = bright, grass = muffled)

```cpp
// Surface resonance frequencies (expert knowledge)
float get_resonance(Surface s) {
    switch(s) {
        case Concrete: return 150.0f;  // Low, dull
        case Wood:     return 250.0f;  // Mid, warm
        case Metal:    return 500.0f;  // High, ringing
        case Gravel:   return 300.0f;  // Crunchy mid
        default:       return 200.0f;
    }
}
```

### Wwise/FMOD Integration

**Key abstractions:**
- **Events**: Trigger sounds (footstep, explosion, ambient loop)
- **RTPC**: Continuous parameters (speed 0-100, health 0-1)
- **Switches**: Discrete choices (surface type, weapon type)
- **States**: Global context (music intensity, underwater)

```cpp
// Material-aware footsteps via Wwise
void OnFootDown(FHitResult& hit) {
    FString surface = DetectSurface(hit.PhysMaterial);
    float speed = GetVelocity().Size();

    SetSwitch("Surface", surface, this);        // Concrete/Wood/Metal
    SetRTPCValue("Impact_Force", speed/600.0f); // 0-1 normalized
    PostEvent(FootstepEvent, this);
}
```

### UI/UX Sound Design

**Principles for app sounds:**
1. **Subtle** - UI sounds at -18 to -24dB
2. **Short** - 50-200ms for most interactions
3. **Consistent** - Same family/timbre across app
4. **Accessible** - Don't rely solely on audio for feedback
5. **Haptic-paired** - iOS haptics should match audio characteristics

**Sound types:**
| Category | Examples | Duration | Character |
|----------|----------|----------|-----------|
| Tap feedback | Button, toggle | 30-80ms | Soft, high-frequency click |
| Success | Save, send, complete | 150-300ms | Rising, positive tone |
| Error | Invalid, failed | 200-400ms | Descending, minor tone |
| Notification | Alert, reminder | 300-800ms | Distinctive, attention-getting |
| Transition | Screen change, modal | 100-250ms | Whoosh, subtle movement |

### iOS/Android Audio Sessions

**iOS AVAudioSession categories:**
- `.ambient` - Mixes with other audio, silenced by ringer
- `.playback` - Interrupts other audio, ignores ringer
- `.playAndRecord` - For voice apps
- `.soloAmbient` - Default, silences other audio

**Critical handlers:**
- Interruption (phone call)
- Route change (headphones unplugged)
- Secondary audio (Siri)

```swift
// Proper iOS audio session setup
func configureAudioSession() {
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
    try? session.setActive(true)

    NotificationCenter.default.addObserver(
        self,
        selector: #selector(handleInterruption),
        name: AVAudioSession.interruptionNotification,
        object: nil
    )
}
```

## Performance Targets

| Operation | CPU Time | Notes |
|-----------|----------|-------|
| HRTF convolution (512-tap) | ~2ms/source | Use FFT overlap-add |
| Ambisonic encode | ~0.1ms/source | Very efficient |
| Ambisonic decode (binaural) | ~1ms total | Supports many sources |
| Procedural footstep | ~1-2ms | vs 500KB per sample |
| Wind synthesis | ~0.5ms/frame | Real-time streaming |
| Wwise event post | &lt;0.1ms | Negligible |
| iOS audio callback | 5-10ms budget | At 48kHz/512 samples |

**Budget guideline**: Audio should use 5-10% of frame time.

## Quick Reference

### Spatial Audio Decision Tree
- **VR with head tracking?** → Ambisonics
- **Few important sources?** → Full HRTF
- **Many background sources?** → Simple panning + distance rolloff
- **Mobile with limited CPU?** → Binaural (simple) or panning

### When to Use Procedural Audio
- Environmental (wind, rain, fire) → Always procedural
- Footsteps → Procedural for large games, samples for small
- UI sounds → Generated once, then cached
- Impacts/explosions → Hybrid (procedural + sample layers)

### Platform Audio Sessions
- **Game with music**: `.ambient` + `mixWithOthers`
- **Meditation/focus app**: `.playback` (interrupt music)
- **Voice chat**: `.playAndRecord`
- **Video player**: `.playback`

## Integrates With

- **voice-audio-engineer** - Voice synthesis and TTS
- **vr-avatar-engineer** - VR audio + avatar integration
- **metal-shader-expert** - GPU audio processing
- **native-app-designer** - App UI sound integration

---

**For detailed implementations**: See `/references/implementations.md`

**Remember**: Great audio is invisible—players feel it, don't notice it. Focus on supporting the experience, not showing off. Procedural audio saves memory and eliminates repetition. Always respect CPU budgets and platform audio session requirements.
