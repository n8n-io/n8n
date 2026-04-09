import type { ModelData } from "./model-data.js";
import type { ElasticSearchQuery } from "./model-libraries-downloads.js";
/**
 * Elements configurable by a model library.
 */
export interface LibraryUiElement {
    /**
     * Pretty name of the library.
     * displayed in tags, and on the main
     * call-to-action button on the model page.
     */
    prettyLabel: string;
    /**
     * Repo name of the library's (usually on GitHub) code repo
     */
    repoName: string;
    /**
     * URL to library's (usually on GitHub) code repo
     */
    repoUrl: string;
    /**
     * URL to library's docs
     */
    docsUrl?: string;
    /**
     * Code snippet(s) displayed on model page
     */
    snippets?: (model: ModelData) => string[];
    /**
     * Elastic query used to count this library's model downloads
     *
     * By default, those files are counted:
     * "config.json", "config.yaml", "hyperparams.yaml", "params.json", "meta.yaml"
     */
    countDownloads?: ElasticSearchQuery;
    /**
     * should we display this library in hf.co/models filter
     * (only for popular libraries with > 100 models)
     */
    filter?: boolean;
}
/**
 * Add your new library here.
 *
 * This is for modeling (= architectures) libraries, not for file formats (like ONNX, etc).
 * (unlike libraries, file formats live in an enum inside the internal codebase.)
 *
 * Doc on how to add a library to the Hub:
 *
 * https://huggingface.co/docs/hub/models-adding-libraries
 *
 * /!\ IMPORTANT
 *
 * The key you choose is the tag your models have in their library_name on the Hub.
 */
export declare const MODEL_LIBRARIES_UI_ELEMENTS: {
    acestep: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "adapter-transformers": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    allennlp: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    anemoi: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    araclip: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        snippets: (model: ModelData) => string[];
    };
    "aviation-ner": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        countDownloads: string;
        filter: false;
    };
    asteroid: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    audiocraft: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    audioseal: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    "bagel-mot": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    bboxmaskpose: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    ben2: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    bertopic: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    big_vision: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    birder: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    birefnet: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    bm25s: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    boltzgen: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    cancertathomev2: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    cartesia_pytorch: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
    };
    cartesia_mlx: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
    };
    champ: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    chatterbox: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: () => string[];
        countDownloads: string;
        filter: false;
    };
    chaossim: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
        filter: false;
    };
    chat_tts: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: () => string[];
        filter: false;
        countDownloads: string;
    };
    "chronos-forecasting": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
    };
    clara: {
        prettyLabel: string;
        repoName: string;
        filter: false;
        repoUrl: string;
        countDownloads: string;
    };
    clipscope: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "cloud-agents": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    colipri: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    cosyvoice: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    cotracker: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    colpali: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    comet: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    cosmos: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    "cxr-foundation": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: () => string[];
        filter: false;
        countDownloads: string;
    };
    deepforest: {
        prettyLabel: string;
        repoName: string;
        docsUrl: string;
        repoUrl: string;
    };
    "depth-anything-v2": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    "depth-pro": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    "derm-foundation": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: () => string[];
        filter: false;
        countDownloads: string;
    };
    "describe-anything": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    "dia-tts": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    dia2: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    "diff-interpretation-tuning": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    diffree: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    diffusers: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    diffusionkit: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
    };
    "docking-at-home": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    doctr: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
    };
    edsnlp: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        snippets: (model: ModelData) => string[];
        countDownloads: string;
    };
    elm: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    espnet: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    fairseq: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    fastai: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    fastprint: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    fasttext: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    fixer: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    flair: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    fme: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        countDownloads: string;
    };
    "gemma.cpp": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "geometry-crafter": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    gliner: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    gliner2: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    "glm-tts": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "glyph-byt5": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    grok: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "habibi-tts": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    hallo: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    hermes: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    hezar: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        countDownloads: string;
    };
    htrflow: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
    };
    "hunyuan-dit": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    "hunyuan3d-2": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    "hunyuanworld-voyager": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
    };
    "hy-worldplay": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "image-matching-models": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    imstoucan: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    "index-tts": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    infinitetalk: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "infinite-you": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    intellifold: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    keras: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    "tf-keras": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        countDownloads: string;
    };
    "keras-hub": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    kernels: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        countDownloads: string;
    };
    "kimi-audio": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    kittentts: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
    };
    kronos: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    k2: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
    };
    "lightning-ir": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
    };
    litert: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "litert-lm": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    lerobot: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        snippets: (model: ModelData) => string[];
    };
    lightglue: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    liveportrait: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "llama-cpp-python": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
    };
    "mini-omni2": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    mindspore: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
    };
    "magi-1": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    "magenta-realtime": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    "mamba-ssm": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        snippets: (model: ModelData) => string[];
    };
    "manas-1": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    "mars5-tts": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    matanyone: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    "mesh-anything": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
        snippets: () => string[];
    };
    merlin: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    medvae: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    mitie: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    "ml-agents": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    "ml-sharp": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    mlx: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    "mlx-image": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    "mlc-llm": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        countDownloads: string;
    };
    model2vec: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    moshi: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    mtvcraft: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    nemo: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    "open-oasis": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    open_clip: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    openpeerllm: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        countDownloads: string;
        filter: false;
    };
    "open-sora": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    outetts: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    paddlenlp: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    PaddleOCR: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    peft: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    "perception-encoder": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        snippets: (model: ModelData) => string[];
        countDownloads: string;
    };
    "phantom-wan": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    "pocket-tts": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
        countDownloads: string;
    };
    "pruna-ai": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        docsUrl: string;
    };
    pxia: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    "pyannote-audio": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    "py-feat": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
    };
    pythae: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    quantumpeer: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    qwen3_tts: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    recurrentgemma: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    relik: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    refiners: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        countDownloads: string;
    };
    renderformer: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    reverb: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
    };
    rkllm: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    saelens: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: () => string[];
        filter: false;
    };
    sam2: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        snippets: (model: ModelData) => string[];
        countDownloads: string;
    };
    "sam-3d-body": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        snippets: (model: ModelData) => string[];
        countDownloads: string;
    };
    "sam-3d-objects": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        snippets: (model: ModelData) => string[];
        countDownloads: string;
    };
    same: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "sample-factory": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    "sap-rpt-1-oss": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
        snippets: () => string[];
    };
    sapiens: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    seedvr: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "self-forcing": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "sentence-transformers": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    setfit: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    sklearn: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    spacy: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    "span-marker": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    speechbrain: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    "ssr-speech": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "stable-audio-tools": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    monkeyocr: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "diffusion-single-file": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "seed-story": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
        snippets: () => string[];
    };
    soloaudio: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    songbloom: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "stable-baselines3": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    stanza: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    supertonic: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: () => string[];
        filter: false;
    };
    swarmformer: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    "f5-tts": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    genmo: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "tencent-song-generation": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    tensorflowtts: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
    };
    tensorrt: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    tabpfn: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
    };
    terratorch: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    "tic-clip": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    timesfm: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    timm: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    tirex: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    torchgeo: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        countDownloads: string;
    };
    transformers: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    "transformers.js": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
    };
    trellis: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    ultralytics: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        filter: false;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    univa: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: true;
        countDownloads: string;
    };
    "uni-3dar": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        countDownloads: string;
    };
    "unity-sentis": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: () => string[];
        filter: true;
        countDownloads: string;
    };
    sana: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    videoprism: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    "vfi-mamba": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    vismatch: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    lvface: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    voicecraft: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
    };
    voxcpm: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    vui: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
        snippets: () => string[];
    };
    vibevoice: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    videox_fun: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
    };
    "wan2.2": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        countDownloads: string;
    };
    wham: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        countDownloads: string;
    };
    whisperkit: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: () => string[];
        countDownloads: string;
    };
    yolov10: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
    yolov26: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        countDownloads: string;
    };
    zonos: {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        docsUrl: string;
        snippets: (model: ModelData) => string[];
        filter: false;
    };
    "3dtopia-xl": {
        prettyLabel: string;
        repoName: string;
        repoUrl: string;
        filter: false;
        countDownloads: string;
        snippets: (model: ModelData) => string[];
    };
};
export type ModelLibraryKey = keyof typeof MODEL_LIBRARIES_UI_ELEMENTS;
export declare const ALL_MODEL_LIBRARY_KEYS: ModelLibraryKey[];
export declare const ALL_DISPLAY_MODEL_LIBRARY_KEYS: ("acestep" | "adapter-transformers" | "allennlp" | "anemoi" | "araclip" | "aviation-ner" | "asteroid" | "audiocraft" | "audioseal" | "bagel-mot" | "bboxmaskpose" | "ben2" | "bertopic" | "big_vision" | "birder" | "birefnet" | "bm25s" | "boltzgen" | "cancertathomev2" | "cartesia_pytorch" | "cartesia_mlx" | "champ" | "chatterbox" | "chaossim" | "chat_tts" | "chronos-forecasting" | "clara" | "clipscope" | "cloud-agents" | "colipri" | "cosyvoice" | "cotracker" | "colpali" | "comet" | "cosmos" | "cxr-foundation" | "deepforest" | "depth-anything-v2" | "depth-pro" | "derm-foundation" | "describe-anything" | "dia-tts" | "dia2" | "diff-interpretation-tuning" | "diffree" | "diffusers" | "diffusionkit" | "docking-at-home" | "doctr" | "edsnlp" | "elm" | "espnet" | "fairseq" | "fastai" | "fastprint" | "fasttext" | "fixer" | "flair" | "fme" | "gemma.cpp" | "geometry-crafter" | "gliner" | "gliner2" | "glm-tts" | "glyph-byt5" | "grok" | "habibi-tts" | "hallo" | "hermes" | "hezar" | "htrflow" | "hunyuan-dit" | "hunyuan3d-2" | "hunyuanworld-voyager" | "hy-worldplay" | "image-matching-models" | "imstoucan" | "index-tts" | "infinitetalk" | "infinite-you" | "intellifold" | "keras" | "tf-keras" | "keras-hub" | "kernels" | "kimi-audio" | "kittentts" | "kronos" | "k2" | "lightning-ir" | "litert" | "litert-lm" | "lerobot" | "lightglue" | "liveportrait" | "llama-cpp-python" | "mini-omni2" | "mindspore" | "magi-1" | "magenta-realtime" | "mamba-ssm" | "manas-1" | "mars5-tts" | "matanyone" | "mesh-anything" | "merlin" | "medvae" | "mitie" | "ml-agents" | "ml-sharp" | "mlx" | "mlx-image" | "mlc-llm" | "model2vec" | "moshi" | "mtvcraft" | "nemo" | "open-oasis" | "open_clip" | "openpeerllm" | "open-sora" | "outetts" | "paddlenlp" | "PaddleOCR" | "peft" | "perception-encoder" | "phantom-wan" | "pocket-tts" | "pruna-ai" | "pxia" | "pyannote-audio" | "py-feat" | "pythae" | "quantumpeer" | "qwen3_tts" | "recurrentgemma" | "relik" | "refiners" | "renderformer" | "reverb" | "rkllm" | "saelens" | "sam2" | "sam-3d-body" | "sam-3d-objects" | "same" | "sample-factory" | "sap-rpt-1-oss" | "sapiens" | "seedvr" | "self-forcing" | "sentence-transformers" | "setfit" | "sklearn" | "spacy" | "span-marker" | "speechbrain" | "ssr-speech" | "stable-audio-tools" | "monkeyocr" | "diffusion-single-file" | "seed-story" | "soloaudio" | "songbloom" | "stable-baselines3" | "stanza" | "supertonic" | "swarmformer" | "f5-tts" | "genmo" | "tencent-song-generation" | "tensorflowtts" | "tensorrt" | "tabpfn" | "terratorch" | "tic-clip" | "timesfm" | "timm" | "tirex" | "torchgeo" | "transformers" | "transformers.js" | "trellis" | "ultralytics" | "univa" | "uni-3dar" | "unity-sentis" | "sana" | "videoprism" | "vfi-mamba" | "vismatch" | "lvface" | "voicecraft" | "voxcpm" | "vui" | "vibevoice" | "videox_fun" | "wan2.2" | "wham" | "whisperkit" | "yolov10" | "yolov26" | "zonos" | "3dtopia-xl")[];
//# sourceMappingURL=model-libraries.d.ts.map