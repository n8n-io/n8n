# Google Play Store — Official Specs & Guidelines

All data from support.google.com and developer.android.com as of March 2026.

## Character Limits

| Field             | Limit       | Indexed?               | Notes                                 |
| ----------------- | ----------- | ---------------------- | ------------------------------------- |
| App Title         | 30 chars    | Yes (strongest signal) | Reduced from 50 in Sept 2021          |
| Short Description | 80 chars    | Yes                    | Visible without expanding             |
| Full Description  | 4,000 chars | **Yes (heavily)**      | Google NLP indexes entire text        |
| Developer Name    | 64 chars    | Partial                | Same emoji/caps restrictions as title |

## Prohibited in Metadata (enforced since Sept 2021)

**Title, Icon, Developer Name:**

- Emojis, emoticons, repeated special characters
- ALL CAPS (unless registered brand)
- Performance claims: "top," "best," "#1," "free," "no ads"
- Misleading store performance or endorsement
- Calls-to-action: "update now," "download now"

**Short Description:**

- Same performance claims as title
- Calls-to-action
- Unattributed testimonials

**Screenshots, Feature Graphic, Video:**

- Time-sensitive taglines
- Calls-to-action ("Download now," "Play now")
- Must authentically showcase app functionality

## Screenshot Specs

| Device     | Min   | Max   | Aspect Ratio | Min Resolution | Max Long Edge |
| ---------- | ----- | ----- | ------------ | -------------- | ------------- |
| Phone      | **2** | **8** | 9:16 or 16:9 | 320px any side | 3,840px       |
| 7" Tablet  | 4     | 8     | 9:16 or 16:9 | 1,080px short  | 7,680px       |
| 10" Tablet | 4     | 8     | 9:16 or 16:9 | 1,080px short  | 7,680px       |
| Chromebook | 4     | 8     | 9:16 or 16:9 | 1,080px short  | 7,680px       |
| Wear OS    | 1     | 8     | **1:1**      | 384x384        | 3,840px       |
| Android TV | 1     | 8     | **16:9**     | 1,920x1,080    | 3,840px       |

- **Recommended phone size:** 1080x1920 (portrait)
- **Format:** JPEG or 24-bit PNG (no alpha)
- **Max file size:** 8 MB each

**Note:** Google Play max is 8 screenshots per device, not 10 like Apple.

## Feature Graphic

- **Dimensions:** 1024 x 500 px (exact, required)
- **Format:** JPEG or 24-bit PNG (no alpha)
- Displayed at top of listing and in featured placements

## App Icon

- **Dimensions:** 512 x 512 px
- **Format:** 32-bit PNG (with alpha)
- **Max file size:** 1,024 KB
- **Shape:** Full square (Google applies 30% corner radius automatically)
- **Prohibited:** Ranking claims, download counts, deal text, emoji

## Preview Video

- **Format:** YouTube URL (public or unlisted)
- **Duration:** 30 seconds to 2 minutes recommended
- No ads, no monetization, must be embeddable, not age-restricted
- **Playback:** Can autoplay inline with muted audio for up to 30 seconds, depending on device, user settings, network and placement. A play button appears when autoplay is unavailable.
- **Creative:** Demonstrate actual app use and the main benefit early, with visuals understandable without audio. Do not assume every visitor autoplays or watches the full video.
- **Measurement:** Tap-to-play rates exclude autoplay exposure; use listing experiments and your own conversion data before deciding whether a video is worthwhile.

Source: [Google Play preview asset guidelines](https://support.google.com/googleplay/android-developer/answer/9866151).

## Store Listing Experiments (A/B Testing)

- **Variants:** Up to 3 per experiment (plus control)
- **Testable:** Icon, feature graphic, screenshots, video, short description, full description
- **Concurrent:** Cannot run more than 1 default graphics experiment simultaneously
- **Audience:** Signed-in Google Play users only
- **Metrics:** First-time installers + retained first-time installers (1-day retention)
- **Duration:** Run at least 7 days (weekday/weekend variance)
- **Localized:** Test across up to 5 languages simultaneously

## Custom Store Listings

- **Max:** 50 per app (100 for Play partners)
- **Customizable:** Title, short/full description, icon, screenshots, feature graphic, video
- **Targeting:** Country/region, pre-registration, install state, Google Ads campaigns, inactive/churned users (28+ days)
- **2025 addition:** Gemini AI auto-generates text for CSLs in Play Console

## Promotional Content (LiveOps)

| Type              | Description                    | Duration             |
| ----------------- | ------------------------------ | -------------------- |
| Offers            | Discounts, free items, bundles | Up to 28 days        |
| Events            | Time-limited in-app events     | Must have time limit |
| Major Update      | Significant new features       | Max 1 week           |
| Crossover (games) | Cross-game/IP collaboration    | Varies               |

- Submit **4+ days** before start (standard review)
- Submit **14+ days** before for featuring requests
- **Impact:** "Over twice as many explore acquisitions during featuring" (official Google)

## Android Vitals — Ranking Thresholds

Apps exceeding these thresholds get **reduced visibility** in search and recommendations.

| Metric                       | Overall Threshold | Per-Device Threshold |
| ---------------------------- | ----------------- | -------------------- |
| User-Perceived Crash Rate    | **1.09%**         | 8%                   |
| User-Perceived ANR Rate      | **0.47%**         | 8%                   |
| Excessive Partial Wake Locks | 5%                | N/A                  |

**Consequences:** Reduced search visibility, warning labels on listing, quality alerts to users before install.
**Recovery:** Google checks daily using 28-day rolling average.

## Search Ranking — Official Factors

Google confirms these affect ranking:

1. **Metadata relevance** — Title carries most weight. NLP scans title + short desc + full desc.
2. **App quality** — Android Vitals (crash/ANR rates)
3. **Ratings and reviews** — Star rating + review text. 85% of featured apps have 4.0+
4. **Install volume and velocity** — Total installs + daily/weekly frequency
5. **Engagement and retention** — Session frequency, duration, retention rates
6. **Update frequency** — Regular updates signal active maintenance
7. **Localization** — Regional keyword/visual adaptation. 59% of US apps localize titles.

Sources: support.google.com/googleplay/android-developer/answer/4448378,
support.google.com/googleplay/android-developer/answer/9898842,
developer.android.com/topic/performance/vitals
