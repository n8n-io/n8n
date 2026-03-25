/**
 * Biden AI Executive Order (since revoked by President Trump):
 * https://web.archive.org/web/20250105222429/https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/
 */
export declare const TFLOPS_THRESHOLD_WHITE_HOUSE_MODEL_TRAINING_TOTAL: number;
export declare const TFLOPS_THRESHOLD_WHITE_HOUSE_MODEL_TRAINING_TOTAL_BIOLOGY: number;
export declare const TFLOPS_THRESHOLD_WHITE_HOUSE_CLUSTER: number;
/**
 * EU AI Act
 * https://ec.europa.eu/commission/presscorner/detail/en/qanda_21_1683
 */
export declare const TFLOPS_THRESHOLD_EU_AI_ACT_MODEL_TRAINING_TOTAL: number;
export interface HardwareSpec {
    /**
     * Approximate value, in FP16 whenever possible for GPUs and FP32 for CPUs.
     * This is only approximate/theoretical and shouldn't be taken too seriously.
     * Currently the CPU values are from cpu-monkey.com
     * while the GPU values are from techpowerup.com
     *
     * Note to reviewers: I got fed up with data entry,
     * and HuggingChat running Llama3 with Web search was failing a bit,
     * so some of those values might be slightly inaccurate. Forgive me and please feel free to improve.
     */
    tflops: number;
    /**
     * If an array is specified, options of memory size (can be VRAM, unified RAM)
     * e.g. an A100 exists in 40 or 80 GB.
     */
    memory?: number[];
}
export declare const DEFAULT_MEMORY_OPTIONS: number[];
export declare const SKUS: {
    GPU: {
        NVIDIA: {
            B200: {
                tflops: number;
                memory: number[];
            };
            H200: {
                tflops: number;
                memory: number[];
            };
            H100: {
                tflops: number;
                memory: number[];
            };
            L40s: {
                tflops: number;
                memory: number[];
            };
            L40: {
                tflops: number;
                memory: number[];
            };
            L20: {
                tflops: number;
                memory: number[];
            };
            L4: {
                tflops: number;
                memory: number[];
            };
            "RTX PRO 6000 WS": {
                tflops: number;
                memory: number[];
            };
            "RTX PRO 6000 Max-Q": {
                tflops: number;
                memory: number[];
            };
            "RTX 6000 Ada": {
                tflops: number;
                memory: number[];
            };
            "RTX 5880 Ada": {
                tflops: number;
                memory: number[];
            };
            "RTX 5000 Ada": {
                tflops: number;
                memory: number[];
            };
            "RTX 4500 Ada": {
                tflops: number;
                memory: number[];
            };
            "RTX 4000 Ada": {
                tflops: number;
                memory: number[];
            };
            "RTX 4000 SFF Ada": {
                tflops: number;
                memory: number[];
            };
            "RTX 2000 Ada": {
                tflops: number;
                memory: number[];
            };
            "RTX A6000": {
                tflops: number;
                memory: number[];
            };
            "RTX A5000": {
                tflops: number;
                memory: number[];
            };
            "RTX A4000": {
                tflops: number;
                memory: number[];
            };
            "RTX A2000": {
                tflops: number;
                memory: number[];
            };
            A100: {
                tflops: number;
                memory: number[];
            };
            A40: {
                tflops: number;
                memory: number[];
            };
            A10: {
                tflops: number;
                memory: number[];
            };
            A2: {
                tflops: number;
                memory: number[];
            };
            "RTX 5090": {
                tflops: number;
                memory: number[];
            };
            "RTX 5090 D": {
                tflops: number;
                memory: number[];
            };
            "RTX 5080": {
                tflops: number;
                memory: number[];
            };
            "RTX 5080 Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 5070": {
                tflops: number;
                memory: number[];
            };
            "RTX 5070 Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 5070 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 5060 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 5060": {
                tflops: number;
                memory: number[];
            };
            "RTX 4090": {
                tflops: number;
                memory: number[];
            };
            "RTX 4090D": {
                tflops: number;
                memory: number[];
            };
            "RTX 4090 Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 4080 SUPER": {
                tflops: number;
                memory: number[];
            };
            "RTX 4080": {
                tflops: number;
                memory: number[];
            };
            "RTX 4080 Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 4070": {
                tflops: number;
                memory: number[];
            };
            "RTX 4070 Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 4070 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 4070 Super": {
                tflops: number;
                memory: number[];
            };
            "RTX 4070 Ti Super": {
                tflops: number;
                memory: number[];
            };
            "RTX 4060": {
                tflops: number;
                memory: number[];
            };
            "RTX 4060 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 4090 Laptop": {
                tflops: number;
                memory: number[];
            };
            "RTX 4080 Laptop": {
                tflops: number;
                memory: number[];
            };
            "RTX 4070 Laptop": {
                tflops: number;
                memory: number[];
            };
            "RTX 4060 Laptop": {
                tflops: number;
                memory: number[];
            };
            "RTX 4050 Laptop": {
                tflops: number;
                memory: number[];
            };
            "RTX 3090": {
                tflops: number;
                memory: number[];
            };
            "RTX 3090 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 3080": {
                tflops: number;
                memory: number[];
            };
            "RTX 3080 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 3080 Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 3070": {
                tflops: number;
                memory: number[];
            };
            "RTX 3070 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 3070 Ti Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 3060 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 3060": {
                tflops: number;
                memory: number[];
            };
            "RTX 2080 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX 2080": {
                tflops: number;
                memory: number[];
            };
            "RTX 2070": {
                tflops: number;
                memory: number[];
            };
            "RTX 2070 SUPER Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 2070 SUPER": {
                tflops: number;
                memory: number[];
            };
            "RTX 3060 Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 3050 Mobile": {
                tflops: number;
                memory: number[];
            };
            "RTX 2060": {
                tflops: number;
                memory: number[];
            };
            "RTX 2060 12GB": {
                tflops: number;
                memory: number[];
            };
            "RTX 2060 Mobile": {
                tflops: number;
                memory: number[];
            };
            "GTX 1080 Ti": {
                tflops: number;
                memory: number[];
            };
            "GTX 1070 Ti": {
                tflops: number;
                memory: number[];
            };
            "GTX 1060": {
                tflops: number;
                memory: number[];
            };
            "GTX 1050 Ti": {
                tflops: number;
                memory: number[];
            };
            "RTX Titan": {
                tflops: number;
                memory: number[];
            };
            "GTX 1660": {
                tflops: number;
                memory: number[];
            };
            "GTX 1650 Mobile": {
                tflops: number;
                memory: number[];
            };
            T4: {
                tflops: number;
                memory: number[];
            };
            T10: {
                tflops: number;
                memory: number[];
            };
            V100: {
                tflops: number;
                memory: number[];
            };
            "Quadro P6000": {
                tflops: number;
                memory: number[];
            };
            P40: {
                tflops: number;
                memory: number[];
            };
            P100: {
                tflops: number;
                memory: number[];
            };
            "Jetson AGX Orin 64GB": {
                tflops: number;
                memory: number[];
            };
            "Jetson AGX Orin 32GB": {
                tflops: number;
                memory: number[];
            };
            "Jetson Orin NX 16GB": {
                tflops: number;
                memory: number[];
            };
            "Jetson Orin NX 8GB": {
                tflops: number;
                memory: number[];
            };
            "Jetson Orin Nano 8GB": {
                tflops: number;
                memory: number[];
            };
            "Jetson Orin Nano 4GB": {
                tflops: number;
                memory: number[];
            };
            "Jetson AGX Xavier": {
                tflops: number;
                memory: number[];
            };
            "Jetson Xavier NX": {
                tflops: number;
                memory: number[];
            };
            "Jetson TX2": {
                tflops: number;
                memory: number[];
            };
            "Jetson Nano": {
                tflops: number;
                memory: number[];
            };
        };
        AMD: {
            MI300: {
                tflops: number;
                memory: number[];
            };
            MI250: {
                tflops: number;
                memory: number[];
            };
            MI210: {
                tflops: number;
                memory: number[];
            };
            MI100: {
                tflops: number;
                memory: number[];
            };
            MI60: {
                tflops: number;
                memory: number[];
            };
            MI50: {
                tflops: number;
                memory: number[];
            };
            "RX 9070 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 9070": {
                tflops: number;
                memory: number[];
            };
            "RX 7900 XTX": {
                tflops: number;
                memory: number[];
            };
            "RX 7900 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 7900 GRE": {
                tflops: number;
                memory: number[];
            };
            "RX 7800 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 7700 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 7600 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 6950 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 6800": {
                tflops: number;
                memory: number[];
            };
            "RX 6700 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 6700": {
                tflops: number;
                memory: number[];
            };
            "RX 6650 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 6600 XT": {
                tflops: number;
                memory: number[];
            };
            "RX 6600": {
                tflops: number;
                memory: number[];
            };
            "Radeon Pro VII": {
                tflops: number;
                memory: number[];
            };
        };
        INTEL: {
            "Arc A750": {
                tflops: number;
                memory: number[];
            };
            "Arc A770": {
                tflops: number;
                memory: number[];
            };
            "Arc B570": {
                tflops: number;
                memory: number[];
            };
            "Arc B580": {
                tflops: number;
                memory: number[];
            };
        };
        QUALCOMM: {
            "Snapdragon X Elite X1E-00-1DE": {
                tflops: number;
            };
            "Snapdragon X Elite X1E-84-100": {
                tflops: number;
            };
            "Snapdragon X Elite X1E-80-100": {
                tflops: number;
            };
            "Snapdragon X Elite X1E-78-100": {
                tflops: number;
            };
            "Snapdragon X Plus X1P-64-100": {
                tflops: number;
            };
        };
    };
    CPU: {
        Intel: {
            "Xeon 4th Generation (Sapphire Rapids)": {
                tflops: number;
            };
            "Xeon 3th Generation (Ice Lake)": {
                tflops: number;
            };
            "Xeon 2th Generation (Cascade Lake)": {
                tflops: number;
            };
            "Xeon E5v4 (Broadwell)": {
                tflops: number;
            };
            "Xeon E5v3 (Haswell)": {
                tflops: number;
            };
            "Xeon E5v2 (Ivy Bridge)": {
                tflops: number;
            };
            "Intel Core Ultra 7 265KF": {
                tflops: number;
            };
            "Intel Core 14th Generation (i7)": {
                tflops: number;
            };
            "Intel Core 13th Generation (i9)": {
                tflops: number;
            };
            "Intel Core 13th Generation (i7)": {
                tflops: number;
            };
            "Intel Core 13th Generation (i5)": {
                tflops: number;
            };
            "Intel Core 13th Generation (i3)": {
                tflops: number;
            };
            "Intel Core 12th Generation (i9)": {
                tflops: number;
            };
            "Intel Core 12th Generation (i7)": {
                tflops: number;
            };
            "Intel Core 12th Generation (i5)": {
                tflops: number;
            };
            "Intel Core 12th Generation (i3)": {
                tflops: number;
            };
            "Intel Core 11th Generation (i9)": {
                tflops: number;
            };
            "Intel Core 11th Generation (i7)": {
                tflops: number;
            };
            "Intel Core 11th Generation (i5)": {
                tflops: number;
            };
            "Intel Core 11th Generation (i3)": {
                tflops: number;
            };
            "Intel Core 10th Generation (i9)": {
                tflops: number;
            };
            "Intel Core 10th Generation (i7)": {
                tflops: number;
            };
            "Intel Core 10th Generation (i5)": {
                tflops: number;
            };
            "Intel Core 10th Generation (i3)": {
                tflops: number;
            };
        };
        AMD: {
            "EPYC 4th Generation (Genoa)": {
                tflops: number;
            };
            "EPYC 3th Generation (Milan)": {
                tflops: number;
            };
            "EPYC 2th Generation (Rome)": {
                tflops: number;
            };
            "EPYC 1st Generation (Naples)": {
                tflops: number;
            };
            "Ryzen Zen 4 7000 (Threadripper)": {
                tflops: number;
            };
            "Ryzen Zen5 9000 (Ryzen 9)": {
                tflops: number;
            };
            "Ryzen Zen5 9000 (Ryzen 7)": {
                tflops: number;
            };
            "Ryzen Zen5 9000 (Ryzen 5)": {
                tflops: number;
            };
            "Ryzen Zen4 7000 (Ryzen 9)": {
                tflops: number;
            };
            "Ryzen Zen4 7000 (Ryzen 7)": {
                tflops: number;
            };
            "Ryzen Zen4 7000 (Ryzen 5)": {
                tflops: number;
            };
            "Ryzen Zen3 5000 (Ryzen 9)": {
                tflops: number;
            };
            "Ryzen Zen3 5000 (Ryzen 7)": {
                tflops: number;
            };
            "Ryzen Zen3 5000 (Ryzen 5)": {
                tflops: number;
            };
            "Ryzen Zen 2  3000 (Threadripper)": {
                tflops: number;
            };
            "Ryzen Zen 2  3000 (Ryzen 9)": {
                tflops: number;
            };
            "Ryzen Zen 2  3000 (Ryzen 7)": {
                tflops: number;
            };
            "Ryzen Zen 2  3000 (Ryzen 5)": {
                tflops: number;
            };
            "Ryzen Zen 2  3000 (Ryzen 3)": {
                tflops: number;
            };
        };
    };
    "Apple Silicon": {
        "-": {
            "Apple M1": {
                tflops: number;
                memory: number[];
            };
            "Apple M1 Pro": {
                tflops: number;
                memory: number[];
            };
            "Apple M1 Max": {
                tflops: number;
                memory: number[];
            };
            "Apple M1 Ultra": {
                tflops: number;
                memory: number[];
            };
            "Apple M2": {
                tflops: number;
                memory: number[];
            };
            "Apple M2 Pro": {
                tflops: number;
                memory: number[];
            };
            "Apple M2 Max": {
                tflops: number;
                memory: number[];
            };
            "Apple M2 Ultra": {
                tflops: number;
                memory: number[];
            };
            "Apple M3": {
                tflops: number;
                memory: number[];
            };
            "Apple M3 Pro": {
                tflops: number;
                memory: number[];
            };
            "Apple M3 Max": {
                tflops: number;
                memory: number[];
            };
            "Apple M3 Ultra": {
                tflops: number;
                memory: number[];
            };
            "Apple M4": {
                tflops: number;
                memory: number[];
            };
            "Apple M4 Pro": {
                tflops: number;
                memory: number[];
            };
            "Apple M4 Max": {
                tflops: number;
                memory: number[];
            };
        };
    };
};
export type SkuType = keyof typeof SKUS;
//# sourceMappingURL=hardware.d.ts.map