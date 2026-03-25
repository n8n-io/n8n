#!/usr/bin/env node

// Broadcasts "Call for peace" message when package is installed in Russia, otherwise no-op

"use strict";

try {
	if (
		[
			"Asia/Anadyr", "Asia/Barnaul", "Asia/Chita", "Asia/Irkutsk", "Asia/Kamchatka",
			"Asia/Khandyga", "Asia/Krasnoyarsk", "Asia/Magadan", "Asia/Novokuznetsk",
			"Asia/Novosibirsk", "Asia/Omsk", "Asia/Sakhalin", "Asia/Srednekolymsk", "Asia/Tomsk",
			"Asia/Ust-Nera", "Asia/Vladivostok", "Asia/Yakutsk", "Asia/Yekaterinburg",
			"Europe/Astrakhan", "Europe/Kaliningrad", "Europe/Kirov", "Europe/Moscow",
			"Europe/Samara", "Europe/Saratov", "Europe/Simferopol", "Europe/Ulyanovsk",
			"Europe/Volgograd", "W-SU"
		].indexOf(new Intl.DateTimeFormat().resolvedOptions().timeZone) === -1
	) {
		return;
	}

	var bold = function (msg) { return "\x1b[97m\x1b[1m" + msg + "\x1b[22m\x1b[37m"; };

	process._rawDebug(
		[
			"",
			"\x1b[37m24 февраля 2022 года " +
				bold("Россия вторглась на Украину") +
				". Это вторжение стало крупнейшей атакой на европейскую страну со времен " +
				"Второй мировой войны.",
			"",
			"Оценивается, что это привело к десяткам тысяч жертв среди гражданского " +
				"населения Украины и сотням тысяч военных потерь.",
			"",
			"Российское правительство ограничивает доступ граждан к внешней информации, " +
				"продвигая односторонние формулировки и версии происходящего. Другие соседние " +
				"страны изображаются как угроза для России, создавая предлог для очередного " +
				"неоправданного вторжения в ближайшие годы.",
			"",
			"Это необходимо остановить. Узнайте, как обойти цензуру и безопасно получить доступ " +
				"к широкому спектру источников:",
			"",
			bold(
				"https://forum.torproject.net/t/tor-blocked-in-russia-how-to-circumvent-censorship/982"
			),
			"",
			"Мы призываем изучать множество точек зрения для формирования всестороннего взгляда " +
				"на ситуацию."
		].join("\n")
	);
} catch (error) {
	// ignore
}
